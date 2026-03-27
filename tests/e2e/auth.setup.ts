import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { test as setup } from '@playwright/test'

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })

const CLIENT_AUTH_FILE = '.auth/client.json'
const OPERATOR_AUTH_FILE = '.auth/operator.json'

/**
 * Playwright records cookies with secure:false when the browser internally
 * upgrades HTTP→HTTPS.  When the stored state is later loaded against an
 * https:// baseURL, those cookies are never sent.  Fix by marking every cookie
 * as secure:true after writing the file.
 */
function fixSecureFlag(filePath: string): void {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const state = JSON.parse(raw)
  state.cookies = (state.cookies ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    secure: true,
  }))
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2))
}

setup('save client auth state', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(
    process.env.TEST_CLIENT_EMAIL ?? 'demo@example.com',
  )
  await page.getByLabel('Password').fill(
    process.env.TEST_CLIENT_PASSWORD ?? 'demo-password-2026',
  )
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
  await page.context().storageState({ path: CLIENT_AUTH_FILE })
  fixSecureFlag(CLIENT_AUTH_FILE)
})

setup('save operator auth state', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(
    process.env.TEST_OPERATOR_EMAIL ?? 'operator@example.com',
  )
  await page.getByLabel('Password').fill(
    process.env.TEST_OPERATOR_PASSWORD ?? 'operator-password-2026',
  )
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
  await page.context().storageState({ path: OPERATOR_AUTH_FILE })
  fixSecureFlag(OPERATOR_AUTH_FILE)
})
