/**
 * Client portal narrative demo tour.
 *
 * Each test = one chapter of the demo. Chapters run serially.
 * slowMo + waitForTimeout pauses give video viewers time to read.
 *
 * Read-only — no form submissions that mutate staging data.
 */
import { test, expect } from '@playwright/test'
import { ClientPortalPage } from '../pages/ClientPortalPage'
import { OnCallPage } from '../pages/OnCallPage'
import { BillingPage } from '../pages/BillingPage'

test.describe.configure({ mode: 'serial' })

test.describe('Client portal demo tour', () => {
  test('01 — dashboard overview', async ({ page }) => {
    const portal = new ClientPortalPage(page)
    await portal.gotoDashboard()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Hover the unread badge if visible
    const unreadBadge = page.getByText(/unread/i).first()
    if (await unreadBadge.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await unreadBadge.hover()
      await page.waitForTimeout(1500)
    }

    // Hover the 7-day chart
    const chart = page.locator('canvas, [class*="chart"], [class*="recharts"]').first()
    if (await chart.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await chart.hover()
      await page.waitForTimeout(1500)
    }

    // Hover billing estimate card
    const estimate = page.getByText(/estimate|billing/i).first()
    if (await estimate.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await estimate.hover()
      await page.waitForTimeout(1500)
    }

    await page.waitForTimeout(1000)
  })

  test('02 — message list', async ({ page }) => {
    const portal = new ClientPortalPage(page)
    await portal.gotoMessages()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Hover first message row to show priority indicator
    const firstRow = page.locator('li, tr, [class*="message-row"]').first()
    if (await firstRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await firstRow.hover()
      await page.waitForTimeout(1500)
    }

    // Scroll to show more messages
    await page.keyboard.press('End')
    await page.waitForTimeout(1500)
    await page.keyboard.press('Home')
    await page.waitForTimeout(1000)
  })

  test('03 — message detail', async ({ page }) => {
    const portal = new ClientPortalPage(page)
    await portal.gotoMessages()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Click the first message to open detail view
    const firstMessage = page.getByRole('link').filter({ hasText: /.+/ }).first()
    if (await firstMessage.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstMessage.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Hover caller info section
      const callerInfo = page.getByText(/caller|from|phone/i).first()
      if (await callerInfo.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await callerInfo.hover()
        await page.waitForTimeout(1500)
      }

      // Hover action buttons (status, mark read, etc.)
      const actionBtn = page.getByRole('button').first()
      if (await actionBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await actionBtn.hover()
        await page.waitForTimeout(1500)
      }
    }

    await page.waitForTimeout(1000)
  })

  test('04 — on-call roster', async ({ page }) => {
    const onCall = new OnCallPage(page)
    await onCall.goto()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    await expect(onCall.heading()).toBeVisible()

    // Hover the first on-call contact if visible
    const contact = page.locator('[class*="contact"], [class*="on-call"]').first()
    if (await contact.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await contact.hover()
      await page.waitForTimeout(1500)
    }

    // Switch to Shifts tab to show schedule
    if (await onCall.shiftsTab().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await onCall.clickShiftsTab()
      await page.waitForTimeout(2000)

      // Hover first shift row
      const shiftRow = page.locator('li, tr').first()
      if (await shiftRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await shiftRow.hover()
        await page.waitForTimeout(1500)
      }
    }

    await page.waitForTimeout(1000)
  })

  test('05 — billing & invoices', async ({ page }) => {
    const billing = new BillingPage(page)
    await billing.goto()
    await page.waitForTimeout(2000)

    await expect(billing.heading()).toBeVisible()

    // Hover the running estimate card
    const estimatedTotal = billing.estimatedTotal()
    if (await estimatedTotal.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await estimatedTotal.hover()
      await page.waitForTimeout(1500)
    }

    // Hover invoice history section header
    const invoiceHeading = billing.invoiceHistoryHeading()
    if (await invoiceHeading.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await invoiceHeading.hover()
      await page.waitForTimeout(1500)
    }

    // Click first invoice to show line items
    const invoiceButtons = billing.invoiceRowButtons()
    const count = await invoiceButtons.count()
    if (count > 0) {
      await invoiceButtons.first().click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Hover invoice line items
      const lineItem = page.locator('[class*="line-item"], tbody tr').first()
      if (await lineItem.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await lineItem.hover()
        await page.waitForTimeout(1500)
      }

      // Close the invoice modal (Escape key — non-destructive)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(1000)
    }

    await page.waitForTimeout(1000)
  })
})
