/**
 * Refreshes .auth/client.json and .auth/operator.json
 * by signing in programmatically via the Supabase admin API
 * and writing Playwright-compatible storageState files.
 *
 * Usage: node scripts/refresh-test-auth.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env.test') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('Missing env vars. Check .env.local')
  process.exit(1)
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const USERS = [
  {
    email: process.env.TEST_CLIENT_EMAIL ?? 'demo@example.com',
    password: process.env.TEST_CLIENT_PASSWORD ?? 'demo-password-2026',
    file: '.auth/client.json',
    label: 'client',
  },
  {
    email: process.env.TEST_OPERATOR_EMAIL ?? 'operator@example.com',
    password: process.env.TEST_OPERATOR_PASSWORD ?? 'operator-password-2026',
    file: '.auth/operator.json',
    label: 'operator',
  },
]

const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? 'unknown'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

mkdirSync('.auth', { recursive: true })

for (const user of USERS) {
  console.log(`\n── ${user.label}: ${user.email}`)

  // 1. Reset password via admin API
  const listRes = await adminClient.auth.admin.listUsers()
  const found = listRes.data?.users?.find(u => u.email === user.email)
  if (!found) {
    console.error(`  ✗ User not found in auth.users`)
    continue
  }

  const updateRes = await adminClient.auth.admin.updateUserById(found.id, {
    password: user.password,
  })
  if (updateRes.error) {
    console.error('  ✗ Password reset failed:', updateRes.error.message)
    continue
  }
  console.log(`  ✓ Password reset to "${user.password}"`)

  // 2. Sign in with the password (using a fresh anon client)
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const signInRes = await anonClient.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  })
  if (signInRes.error || !signInRes.data.session) {
    console.error('  ✗ Sign-in failed:', signInRes.error?.message ?? 'no session')
    continue
  }

  const { access_token, refresh_token } = signInRes.data.session
  console.log(`  ✓ Signed in — access token ...${access_token.slice(-12)}`)

  // 3. Build Playwright storageState
  // Supabase JS SDK v2 stores the session in localStorage under the key
  // "sb-{ref}-auth-token" as a JSON string.
  const tokenPayload = JSON.stringify({
    access_token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token,
    user: signInRes.data.user,
  })

  // Encode as base64 to match what Supabase SSR/browser client stores
  const encoded = 'base64-' + Buffer.from(tokenPayload).toString('base64')

  const storageState = {
    cookies: [
      {
        name: `sb-${PROJECT_REF}-auth-token`,
        value: encoded,
        domain: new URL(BASE_URL).hostname,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400 * 7,
        httpOnly: true,
        secure: BASE_URL.startsWith('https'),
        sameSite: 'Lax',
      },
    ],
    origins: [],
  }

  writeFileSync(user.file, JSON.stringify(storageState, null, 2))
  console.log(`  ✓ Written to ${user.file}`)
}

console.log('\nDone. Re-run your Playwright tests with --no-deps.')
