/**
 * Visual QA pass — screenshot all redesigned routes, collect console errors.
 * Run as a standalone project; does not depend on setup/auth projects.
 */
import { test, expect, Page, ConsoleMessage } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const SCREENSHOT_DIR = path.join(process.cwd(), 'visual-qa-screenshots')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

async function captureRoute(
  page: Page,
  route: string,
  name: string,
  errors: string[],
) {
  ensureDir(SCREENSHOT_DIR)
  const consoleErrors: string[] = []

  const handler = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(`[console.error] ${msg.text()}`)
  }
  page.on('console', handler)

  const response = await page.goto(route, { waitUntil: 'networkidle', timeout: 30_000 })
  const status = response?.status() ?? 0

  // Wait a beat for client hydration
  await page.waitForTimeout(1500)

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  })

  page.off('console', handler)

  if (consoleErrors.length) {
    errors.push(`\n=== ${name} (${route}) ===`)
    errors.push(...consoleErrors)
  }

  return { status, consoleErrors }
}

// ──────────────────────────────────────────────
// AUTH ROUTES  (no auth state needed)
// ──────────────────────────────────────────────
test.describe('Auth routes', () => {
  const routes = [
    { path: '/login', name: '01-login' },
    { path: '/login/forgot-password', name: '02-forgot-password' },
    { path: '/login/reset-password', name: '03-reset-password' },
    { path: '/login/magic-link-sent', name: '04-magic-link-sent' },
  ]

  for (const r of routes) {
    test(r.name, async ({ page }) => {
      const errors: string[] = []
      const { status } = await captureRoute(page, r.path, r.name, errors)

      if (errors.length) {
        console.log(errors.join('\n'))
      }

      // Page must not be a blank white screen — expect some recognizable text
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.length, `${r.name} appears blank`).toBeGreaterThan(20)
      expect(status, `${r.name} returned HTTP ${status}`).toBeLessThan(500)
    })
  }
})

// ──────────────────────────────────────────────
// PLATFORM (CLIENT) ROUTES
// ──────────────────────────────────────────────
test.describe('Platform routes', () => {
  test.use({ storageState: '.auth/client.json' })

  const routes = [
    { path: '/answering-service/dashboard', name: '05-dashboard' },
    { path: '/answering-service/messages', name: '06-messages' },
    { path: '/answering-service/on-call', name: '07-on-call' },
    { path: '/answering-service/billing', name: '08-billing' },
    { path: '/answering-service/settings', name: '09-settings' },
    { path: '/answering-service/setup', name: '10-setup' },
  ]

  for (const r of routes) {
    test(r.name, async ({ page }) => {
      const errors: string[] = []
      const { status } = await captureRoute(page, r.path, r.name, errors)

      if (errors.length) {
        console.log(errors.join('\n'))
      }

      // Should not have been redirected to login
      expect(page.url(), `${r.name} got redirected away`).toContain(r.path)
      expect(status, `${r.name} returned HTTP ${status}`).toBeLessThan(500)

      // Sidebar should be present
      const sidebar = page.locator('nav').first()
      await expect(sidebar, `${r.name} sidebar missing`).toBeVisible()
    })
  }
})

// ──────────────────────────────────────────────
// OPERATOR ROUTES
// ──────────────────────────────────────────────
test.describe('Operator routes', () => {
  test.use({ storageState: '.auth/operator.json' })

  const routes = [
    { path: '/operator/clients', name: '11-operator-clients' },
    { path: '/operator/usage', name: '12-operator-usage' },
    { path: '/operator/billing-templates', name: '13-operator-billing-templates' },
    { path: '/operator/api-webhooks', name: '14-operator-api-webhooks' },
    { path: '/operator/settings', name: '15-operator-settings' },
  ]

  for (const r of routes) {
    test(r.name, async ({ page }) => {
      const errors: string[] = []
      const { status } = await captureRoute(page, r.path, r.name, errors)

      if (errors.length) {
        console.log(errors.join('\n'))
      }

      expect(page.url(), `${r.name} got redirected away`).toContain(r.path)
      expect(status, `${r.name} returned HTTP ${status}`).toBeLessThan(500)

      // Operator sidebar should be present
      const sidebar = page.locator('nav').first()
      await expect(sidebar, `${r.name} operator sidebar missing`).toBeVisible()
    })
  }
})
