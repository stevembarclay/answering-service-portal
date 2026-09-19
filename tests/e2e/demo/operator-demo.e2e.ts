/**
 * Operator portal narrative demo tour.
 *
 * Each test = one chapter of the demo. Chapters run serially.
 * slowMo + waitForTimeout pauses give video viewers time to read.
 *
 * Read-only — no form submissions that mutate staging data.
 */
import { test, expect } from '@playwright/test'
import { OperatorPortalPage } from '../pages/OperatorPortalPage'
import { OperatorClientsPage } from '../pages/OperatorClientsPage'
import { OperatorClientDetailPage } from '../pages/OperatorClientDetailPage'

test.describe.configure({ mode: 'serial' })

test.describe('Operator demo tour', () => {
  test('01 — client list with health scores', async ({ page }) => {
    const portal = new OperatorPortalPage(page)
    await portal.gotoClients()
    await page.waitForLoadState('networkidle')
    // Pause so the viewer can read the client list
    await page.waitForTimeout(2000)

    const clients = new OperatorClientsPage(page)
    await expect(clients.heading()).toBeVisible()

    // Highlight a known client by hovering over it
    const riverside = clients.clientByName('Riverside Law Group')
    if (await riverside.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await riverside.hover()
      await page.waitForTimeout(1500)
    }

    // Hover any health score badge visible on the page
    const badge = page.locator('[class*="badge"], [class*="score"]').first()
    if (await badge.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await badge.hover()
      await page.waitForTimeout(1500)
    }

    await page.waitForTimeout(1000)
  })

  test('02 — client detail: who-to-call tab', async ({ page }) => {
    const clients = new OperatorClientsPage(page)
    await clients.goto()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Click first client to open detail
    await clients.clickFirstClient()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Overview / Who-to-call is the default tab — hover the health score section
    const detail = new OperatorClientDetailPage(page)
    const healthSection = detail.healthScoreSection()
    if (await healthSection.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await healthSection.hover()
      await page.waitForTimeout(1500)
    }

    // Scroll down to show contact list
    await page.keyboard.press('End')
    await page.waitForTimeout(1500)
    await page.keyboard.press('Home')
    await page.waitForTimeout(1000)
  })

  test('03 — client detail: billing tab', async ({ page }) => {
    const clients = new OperatorClientsPage(page)
    await clients.goto()
    await page.waitForLoadState('networkidle')
    await clients.clickFirstClient()
    await page.waitForLoadState('networkidle')

    const detail = new OperatorClientDetailPage(page)
    await detail.clickBillingTab()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Hover the billing total if visible
    const billingTotal = page.getByText(/estimated|total|billing/i).first()
    if (await billingTotal.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await billingTotal.hover()
      await page.waitForTimeout(1500)
    }

    // Scroll to show invoice line items
    await page.keyboard.press('End')
    await page.waitForTimeout(1500)
    await page.keyboard.press('Home')
    await page.waitForTimeout(1000)
  })

  test('04 — analytics dashboard', async ({ page }) => {
    const portal = new OperatorPortalPage(page)
    await portal.gotoAnalytics()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Hover the call volume chart area if present
    const chart = page.locator('canvas, [class*="chart"], [class*="recharts"]').first()
    if (await chart.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await chart.hover()
      await page.waitForTimeout(1500)
    }

    // Scroll to show additional metrics
    await page.keyboard.press('End')
    await page.waitForTimeout(1500)
    await page.keyboard.press('Home')
    await page.waitForTimeout(1000)
  })

  test('05 — billing templates', async ({ page }) => {
    const portal = new OperatorPortalPage(page)
    await portal.gotoBillingTemplates()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Hover first template row
    const templateRow = page.locator('li, tr, [class*="template"]').first()
    if (await templateRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await templateRow.hover()
      await page.waitForTimeout(1500)
    }

    await page.waitForTimeout(1000)
  })

  test('06 — API & webhooks', async ({ page }) => {
    const portal = new OperatorPortalPage(page)
    await portal.gotoApiWebhooks()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Hover API key row if visible
    const keyRow = page.getByText(/API key|api_key/i).first()
    if (await keyRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await keyRow.hover()
      await page.waitForTimeout(1500)
    }

    // Scroll to webhook delivery log section
    await page.keyboard.press('End')
    await page.waitForTimeout(2000)

    // Hover first delivery log row if present
    const logRow = page.locator('tbody tr').first()
    if (await logRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logRow.hover()
      await page.waitForTimeout(1500)
    }

    await page.keyboard.press('Home')
    await page.waitForTimeout(1000)
  })
})
