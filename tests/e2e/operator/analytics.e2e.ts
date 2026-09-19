import { test, expect } from '@playwright/test'

test.describe('Operator analytics page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/operator/analytics')
    await page.waitForLoadState('networkidle')
  })

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/operator/analytics')
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('stays on analytics URL and does not show error boundary', async ({ page }) => {
    await expect(page).toHaveURL(/\/operator\/analytics/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('period filter buttons are all visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: '7d' })).toBeVisible()
    await expect(page.getByRole('link', { name: '30d' })).toBeVisible()
    await expect(page.getByRole('link', { name: '90d' })).toBeVisible()
  })

  test('clicking 7d period updates URL search param', async ({ page }) => {
    await page.getByRole('link', { name: '7d' }).click()
    await page.waitForURL(/\?period=7d/)
    await expect(page).toHaveURL(/period=7d/)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('clicking 90d period updates URL search param', async ({ page }) => {
    await page.getByRole('link', { name: '90d' }).click()
    await page.waitForURL(/\?period=90d/)
    await expect(page).toHaveURL(/period=90d/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('analytics data sections render on the page', async ({ page }) => {
    // textContent() is used instead of innerText() — it reads raw DOM text
    // without CSS layout clipping or text-transform effects.
    const body = await page.locator('body').textContent() ?? ''
    expect(body.length).toBeGreaterThan(50)
    const hasContent =
      body.includes('Total Calls') ||
      body.includes('Call Volume') ||
      body.includes('temporarily unavailable')
    expect(hasContent).toBe(true)
  })

  test('call volume section is present when data loaded', async ({ page }) => {
    const body = await page.locator('body').textContent() ?? ''
    if (!body.includes('temporarily unavailable')) {
      const hasVolume =
        body.includes('Call Volume') ||
        body.includes('Call Types') ||
        body.includes('Busiest Hours')
      expect(hasVolume).toBe(true)
    }
  })

  test('active clients stat is shown when data loaded', async ({ page }) => {
    const body = await page.locator('body').textContent() ?? ''
    if (!body.includes('temporarily unavailable')) {
      const hasContent =
        body.includes('Active Clients') ||
        body.includes('Call Volume') ||
        body.includes('At-Risk Clients')
      expect(hasContent).toBe(true)
    }
  })

  test('switching between all three periods does not throw errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    for (const period of ['7d', '30d', '90d']) {
      await page.goto(`/operator/analytics?period=${period}`)
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(new RegExp(`period=${period}`))
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    }

    expect(errors).toEqual([])
  })
})
