/**
 * Screenshot capture script — generates `docs/screenshots/*.png` for the README.
 *
 * Run against a seeded dev server:
 *   npm run screenshots
 *
 * Credentials are read from .env.test, falling back to the demo seed defaults.
 */

import * as path from 'path'
import * as fs from 'fs'
import { test } from '@playwright/test'

const SCREENSHOT_DIR = path.join(__dirname, '../../docs/screenshots')

const CLIENT_EMAIL =
  process.env.TEST_CLIENT_EMAIL ?? 'demo@example.com'
const CLIENT_PASSWORD =
  process.env.TEST_CLIENT_PASSWORD ?? 'demo-password-2026'
const OPERATOR_EMAIL =
  process.env.TEST_OPERATOR_EMAIL ?? 'operator@example.com'
const OPERATOR_PASSWORD =
  process.env.TEST_OPERATOR_PASSWORD ?? 'operator-password-2026'

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
})

// ---------------------------------------------------------------------------
// Client portal
// ---------------------------------------------------------------------------

test.describe('client portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email address').fill(CLIENT_EMAIL)
    await page.getByLabel('Password').fill(CLIENT_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: 15_000,
    })
  })

  test('dashboard', async ({ page }) => {
    await page.goto('/answering-service/dashboard')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'client-dashboard.png'),
    })
  })

  test('messages', async ({ page }) => {
    await page.goto('/answering-service/messages')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'client-messages.png'),
    })
  })

  test('on-call schedule', async ({ page }) => {
    await page.goto('/answering-service/on-call')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'client-on-call.png'),
    })
  })

  test('billing', async ({ page }) => {
    await page.goto('/answering-service/billing')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'client-billing.png'),
    })
  })

  test('setup wizard', async ({ page }) => {
    await page.goto('/answering-service/setup')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'client-wizard.png'),
    })
  })
})

// ---------------------------------------------------------------------------
// Operator portal
// ---------------------------------------------------------------------------

test.describe('operator portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email address').fill(OPERATOR_EMAIL)
    await page.getByLabel('Password').fill(OPERATOR_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: 15_000,
    })
  })

  test('clients list', async ({ page }) => {
    await page.goto('/operator/clients')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'operator-clients.png'),
    })
  })

  test('activity feed', async ({ page }) => {
    await page.goto('/operator/activity')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'operator-activity.png'),
    })
  })

  test('settings', async ({ page }) => {
    await page.goto('/operator/settings')
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'operator-settings.png'),
    })
  })
})
