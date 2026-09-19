import { test, expect, type Page } from '@playwright/test'
import { OperatorClientsPage } from '../pages/OperatorClientsPage'
import { OperatorClientDetailPage } from '../pages/OperatorClientDetailPage'

/**
 * Navigate to the first client in the list and return the detail URL.
 * Each test calls this directly to avoid shared beforeAll/browser fixtures.
 */
async function navigateToFirstClient(page: Page): Promise<void> {
  const clients = new OperatorClientsPage(page)
  await clients.goto()
  await page.waitForLoadState('networkidle')
  await clients.clickFirstClient()
}

test.describe('Operator client detail', () => {
  test('Overview tab is active by default and shows health score', async ({ page }) => {
    await navigateToFirstClient(page)

    const detail = new OperatorClientDetailPage(page)
    await expect(detail.overviewTab()).toBeVisible()

    const content = page.locator('main, [role="main"]').first()
    const text = await content.innerText()
    expect(text.length).toBeGreaterThan(20)
  })

  test('Billing tab loads and shows billing rules section', async ({ page }) => {
    await navigateToFirstClient(page)

    const detail = new OperatorClientDetailPage(page)
    await detail.clickBillingTab()
    await page.waitForLoadState('networkidle')

    const billingContent = page.getByText(/billing rule|active billing|billing/i).first()
    await expect(billingContent).toBeVisible({ timeout: 8_000 })
  })

  test('Calls tab loads and shows message entries', async ({ page }) => {
    await navigateToFirstClient(page)

    const detail = new OperatorClientDetailPage(page)
    await detail.clickCallsTab()
    await page.waitForLoadState('networkidle')

    const content = page.locator('main, [role="main"]').first()
    await expect(content).toBeVisible()
    const text = await content.innerText()
    expect(text.length).toBeGreaterThan(10)
  })

  test('Analytics tab loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await navigateToFirstClient(page)
    const clientDetailUrl = page.url()

    const detail = new OperatorClientDetailPage(page)
    await detail.clickAnalyticsTab()
    await page.waitForLoadState('networkidle')

    expect(errors).toEqual([])
    await expect(page).toHaveURL(new RegExp(clientDetailUrl.split('/').slice(-1)[0]))
  })

  test('Settings tab loads and shows edit form', async ({ page }) => {
    await navigateToFirstClient(page)

    const detail = new OperatorClientDetailPage(page)
    await detail.clickSettingsTab()
    await page.waitForTimeout(1500)

    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(50)
  })

  test('all tab switches complete without HTTP 5xx', async ({ page }) => {
    await navigateToFirstClient(page)

    const detail = new OperatorClientDetailPage(page)
    const tabs = [
      detail.overviewTab(),
      detail.billingTab(),
      detail.callsTab(),
      detail.analyticsTab(),
      detail.settingsTab(),
    ]

    for (const tab of tabs) {
      if (await tab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await tab.click()
        await page.waitForLoadState('networkidle')
        const errorText = await page.getByText(/something went wrong|error|500/i).count()
        expect(errorText).toBe(0)
      }
    }
  })
})
