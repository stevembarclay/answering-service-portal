/**
 * scripts/provision-operator.ts
 *
 * Creates a new operator org + admin user in one step.
 * Safe to run multiple times — checks for slug uniqueness before inserting.
 *
 * Usage:
 *   npx tsx scripts/provision-operator.ts
 *   npx tsx scripts/provision-operator.ts --org-name="Acme Answering" --email="admin@acme.com" --password="secret123"
 *
 * All flags are optional — script prompts for any missing values.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as readline from 'readline'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  console.error('Copy .env.example to .env.local and fill in your Supabase credentials.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const arg = process.argv.find((a) => a.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : undefined
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/-$/, '')
}

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const display = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `
  return new Promise((resolve) => {
    rl.question(display, (answer) => {
      rl.close()
      resolve(answer.trim() || defaultValue || '')
    })
  })
}

// ─── Provisioning steps ───────────────────────────────────────────────────────

async function collectInputs(): Promise<{
  orgName: string
  orgSlug: string
  adminEmail: string
  adminPassword: string
}> {
  const orgName = getArg('org-name') ?? (await prompt('Operator org name (e.g. "Acme Answering Service")'))
  if (!orgName) {
    console.error('ERROR: Org name is required.')
    process.exit(1)
  }

  const defaultSlug = slugify(orgName)
  const orgSlug = getArg('org-slug') ?? (await prompt('Org slug', defaultSlug))
  if (!orgSlug) {
    console.error('ERROR: Org slug is required.')
    process.exit(1)
  }
  if (!/^[a-z0-9-]+$/.test(orgSlug)) {
    console.error('ERROR: Slug must be lowercase letters, numbers, and hyphens only.')
    process.exit(1)
  }

  const adminEmail = getArg('email') ?? (await prompt('Admin email'))
  if (!adminEmail || !adminEmail.includes('@')) {
    console.error('ERROR: A valid admin email is required.')
    process.exit(1)
  }

  const adminPassword = getArg('password') ?? (await prompt('Admin password (min 8 characters)'))
  if (!adminPassword || adminPassword.length < 8) {
    console.error('ERROR: Password must be at least 8 characters.')
    process.exit(1)
  }

  return { orgName, orgSlug, adminEmail, adminPassword }
}

async function createOrg(name: string, slug: string): Promise<string> {
  const { data: existing } = await supabase
    .from('operator_orgs')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    console.error(`ERROR: An operator org with slug "${slug}" already exists (name: "${existing.name}").`)
    console.error('Choose a different slug or delete the existing org first.')
    process.exit(1)
  }

  const { data, error } = await supabase
    .from('operator_orgs')
    .insert({ name, slug, plan: 'pro', status: 'active' })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create operator org: ${error?.message ?? 'Unknown error'}`)
  }

  return data.id as string
}

async function ensureAdminUser(email: string, password: string): Promise<string> {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) throw new Error(`Failed to list users: ${listError.message}`)

  const existing = listData.users.find((u) => u.email === email)
  if (existing) {
    console.log(`  User ${email} already exists — updating password and confirming email.`)
    await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
    return existing.id
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    throw new Error(`Failed to create user: ${error?.message ?? 'Unknown error'}`)
  }
  return data.user.id
}

async function linkUserToOrg(operatorOrgId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('operator_users')
    .upsert(
      { operator_org_id: operatorOrgId, user_id: userId, role: 'admin' },
      { onConflict: 'operator_org_id,user_id' },
    )
  if (error) throw new Error(`Failed to link user to org: ${error.message}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n── Provision Operator ──────────────────────────────')
  console.log('Creates a new operator org and admin account.\n')

  const { orgName, orgSlug, adminEmail, adminPassword } = await collectInputs()

  console.log('\nProvisioning...')
  console.log(`  Creating org: ${orgName} (${orgSlug})`)
  const orgId = await createOrg(orgName, orgSlug)

  console.log(`  Creating admin user: ${adminEmail}`)
  const userId = await ensureAdminUser(adminEmail, adminPassword)

  console.log('  Linking user to org...')
  await linkUserToOrg(orgId, userId)

  console.log('\n── Done ────────────────────────────────────────────')
  console.log(`  Org name:  ${orgName}`)
  console.log(`  Org slug:  ${orgSlug}`)
  console.log(`  Org ID:    ${orgId}`)
  console.log(`  Email:     ${adminEmail}`)
  console.log(`  Password:  ${adminPassword}`)
  console.log('\nNext steps:')
  console.log('  1. Log in at your deployment URL with the credentials above.')
  console.log('  2. You will be redirected to /operator/clients.')
  console.log('  3. Configure branding at /operator/settings.')
  console.log('  4. Add your first client at /operator/clients/new.\n')
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
