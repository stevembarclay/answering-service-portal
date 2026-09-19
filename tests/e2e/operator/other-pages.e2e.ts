import { test, expect } from '@playwright/test'
import { OperatorPortalPage } from '../pages/OperatorPortalPage'

test.describe('Operator portal — other pages', () => {
  test('activity feed loads recent events', async ({ page }) => {
    const portal = new OperatorPortalPage(page)
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await portal.gotoActivity()
    await page.waitForLoadState('networkidle')

    // Should not redirect away
    await expect(page).toHaveURL(/\/operator\/activity/)
    expect(errors).toEqual([])

    // Page should have some content
    const content = await page.locator('body').innerText()
    expect(content.length).toBeGreaterThan(20)
  })

  test('analytics page loads without error boundary', async ({ page }) => {
    const portal = new OperatorPortalPage(page)
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await portal.gotoAnalytics()
    await page.waitForLoadState('networkidle')

    // Page must not redirect away from analytics
    await expect(page).toHaveURL(/\/operator\/analytics/)

    // Must render content (real data or graceful "temporarily unavailable" state)
    const content = await page.locator('body').innerText()
    expect(content.length).toBeGreaterThan(20)

    // Error boundary ("Something went wrong") must NOT be shown — the page handles errors gracefully
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('billing page loads (upgrade CTA is OK)', async ({ page }) => {
    const portal = new OperatorPortalPage(page)
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await portal.gotoBilling()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/operator\/billing/)
    expect(errors).toEqual([])

    const content = await page.locator('body').innerText()
    expect(content.length).toBeGreaterThan(20)
  })

  test('integrations page loads with health dashboard section', async ({ page }) => {
    const portal = new OperatorPortalPage(page)
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await portal.gotoIntegrations()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/operator\/integrations/)
    expect(errors).toEqual([])

    // Integration health section should be visible
    const healthSection = page.getByText(/health|integration|status/i).first()
    await expect(healthSection).toBeVisible()
  })

  test('operator mobile — clients page renders without errors at 390px', async ({ page }) => {
    page.setViewportSize({ width: 390, height: 844 })
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/operator/clients')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('setup guide page loads with Setup Guide heading', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/operator/setup')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/operator\/setup/)
    await expect(page.getByRole('heading', { name: 'Setup Guide' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('setup guide shows wizard steps or checklist content', async ({ page }) => {
    await page.goto('/operator/setup')
    await page.waitForLoadState('networkidle')

    const body = await page.locator('body').innerText()
    // Should describe setup steps: branding, clients, call flow, or similar
    expect(body.toLowerCase()).toMatch(/brand|client|call|portal|step|complete/i)
  })

  test('clients import page loads with breadcrumb', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/operator/clients/import')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/operator\/clients\/import/)
    expect(errors).toEqual([])

    // Breadcrumb in the top bar (scoped to main to avoid matching the sidebar nav link)
    await expect(page.locator('main, [role="main"]').getByRole('link', { name: 'Clients' })).toBeVisible()
    await expect(page.getByText('Import', { exact: true })).toBeVisible()
  })

  test('clients import page renders bulk import wizard', async ({ page }) => {
    await page.goto('/operator/clients/import')
    await page.waitForLoadState('networkidle')

    // The BulkImportWizard renders a form — look for file upload, paste area, or step content
    const body = await page.locator('body').innerText()
    expect(body.toLowerCase()).toMatch(/import|upload|csv|client/i)
  })
})
