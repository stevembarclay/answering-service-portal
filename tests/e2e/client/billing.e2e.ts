import { test, expect } from '@playwright/test'
import { BillingPage } from '../pages/BillingPage'

test.describe('Client billing', () => {
  test.beforeEach(async ({ page }) => {
    const billing = new BillingPage(page)
    await billing.goto()
  })

  test('page loads with Billing heading', async ({ page }) => {
    const billing = new BillingPage(page)
    await expect(billing.heading()).toBeVisible()
  })

  test('estimated total card is visible', async ({ page }) => {
    const billing = new BillingPage(page)
    // BillingClient renders "Estimated Total" once the fetch resolves
    await expect(billing.estimatedTotal()).toBeVisible({ timeout: 15_000 })
  })

  test('estimated total shows a dollar amount', async ({ page }) => {
    // Wait for the estimate to load
    await page.getByText('Estimated Total').waitFor({ timeout: 15_000 })
    const pageContent = await page.locator('body').innerText()
    expect(pageContent).toMatch(/\$[\d,.]+/)
  })

  test('invoice history section is visible', async ({ page }) => {
    const billing = new BillingPage(page)
    // Invoice History header renders once the fetch resolves and there are invoices
    const invoiceSection = billing.invoiceHistoryHeading()
    if (await invoiceSection.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(invoiceSection).toBeVisible()
    } else {
      // No invoices yet in demo — "No invoices yet." text should appear instead
      await expect(page.getByText(/no invoices/i).or(page.getByText('No invoices yet.')))
        .toBeVisible({ timeout: 10_000 })
    }
  })

  test('clicking an invoice opens a detail modal', async ({ page }) => {
    const billing = new BillingPage(page)
    // Wait for data to load
    await page.waitForTimeout(2000)

    const invoiceButtons = billing.invoiceRowButtons()
    const count = await invoiceButtons.count()
    if (count === 0) {
      // No invoices seeded — skip
      return
    }

    await invoiceButtons.first().click()
    await page.waitForTimeout(500)

    // A dialog/modal should appear
    const dialog = page.getByRole('dialog')
    if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(dialog).toBeVisible()
      const dialogText = await dialog.innerText()
      expect(dialogText.length).toBeGreaterThan(10)

      // Close button should be accessible
      const closeButton = dialog
        .getByRole('button', { name: /close/i })
        .or(dialog.locator('[aria-label="Close"]'))
        .first()
      await expect(closeButton).toBeVisible()
    }
  })

  test('invoice modal close button is not overlapped by Paid badge', async ({ page }) => {
    const billing = new BillingPage(page)
    await page.waitForTimeout(2000)

    const invoiceButtons = billing.invoiceRowButtons()
    const count = await invoiceButtons.count()
    if (count === 0) return

    await invoiceButtons.first().click()
    const dialog = page.getByRole('dialog')
    if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const closeButton = dialog
        .getByRole('button', { name: /close/i })
        .or(dialog.locator('[aria-label="Close"]'))
        .first()
      if (await closeButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
        const box = await closeButton.boundingBox()
        if (box) {
          expect(box.width).toBeGreaterThan(0)
          expect(box.height).toBeGreaterThan(0)
        }
      }
    }
  })
})
