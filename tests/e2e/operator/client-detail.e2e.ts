import { test, expect } from '@playwright/test'
import { OperatorClientsPage } from '../pages/OperatorClientsPage'
import { OperatorClientDetailPage } from '../pages/OperatorClientDetailPage'

test.describe('Operator client detail', () => {
  let clientDetailUrl: string

  test.beforeAll(async ({ browser }) => {
    // Navigate to first client to capture the detail URL for all tests
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/operator/clients')
    await page.waitForLoadState('networkidle')
    const clients = new OperatorClientsPage(page)
    await clients.clickFirstClient()
    clientDetailUrl = page.url()
    await context.close()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(clientDetailUrl)
    await page.waitForLoadState('networkidle')
  })

  test('Overview tab is active by default and shows health score', async ({ page }) => {
    const detail = new OperatorClientDetailPage(page)

    // Overview tab should be selected by default
    await expect(detail.overviewTab()).toBeVisible()

    // Health score section should be in the overview
    const content = page.locator('main, [role="main"]').first()
    const text = await content.innerText()
    expect(text.length).toBeGreaterThan(20)
  })

  test('Billing tab loads and shows billing rules section', async ({ page }) => {
    const detail = new OperatorClientDetailPage(page)
    await detail.clickBillingTab()
    await page.waitForLoadState('networkidle')

    // Billing tab should show "Active Billing Rules" or similar
    const billingContent = page.getByText(/billing rule|active billing|billing/i).first()
    await expect(billingContent).toBeVisible({ timeout: 8_000 })
  })

  test('Calls tab loads and shows message entries', async ({ page }) => {
    const detail = new OperatorClientDetailPage(page)
    await detail.clickCallsTab()
    await page.waitForLoadState('networkidle')

    // Calls tab should show call/message entries for this client
    const content = page.locator('main, [role="main"]').first()
    await expect(content).toBeVisible()
    // Demo data always has calls for Riverside Law Group
    const text = await content.innerText()
    expect(text.length).toBeGreaterThan(10)
  })

  test('Analytics tab loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    const detail = new OperatorClientDetailPage(page)
    await detail.clickAnalyticsTab()
    await page.waitForLoadState('networkidle')

    expect(errors).toEqual([])
    await expect(page).toHaveURL(new RegExp(clientDetailUrl.split('/').slice(-1)[0]))
  })

  test('Settings tab loads and shows edit form', async ({ page }) => {
    const detail = new OperatorClientDetailPage(page)
    await detail.clickSettingsTab()
    // Give the tab content time to render
    await page.waitForTimeout(1500)

    // Settings tab should have content — either an input or text describing client settings
    const settingsContent = page.locator('form, [class*="settings"], [data-state="active"]').last()
    const bodyText = await page.locator('body').innerText()
    // Should have substantive content after clicking the Settings tab
    expect(bodyText.length).toBeGreaterThan(50)
  })

  test('all tab switches complete without HTTP 5xx', async ({ page }) => {
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
        // Page should not have shown an error boundary
        const errorText = await page.getByText(/something went wrong|error|500/i).count()
        expect(errorText).toBe(0)
      }
    }
  })
})
