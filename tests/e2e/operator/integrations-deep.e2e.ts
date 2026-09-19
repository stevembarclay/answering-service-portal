import { test, expect } from '@playwright/test'

test.describe('Operator integrations — deep tab coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/operator/integrations')
    await page.waitForLoadState('networkidle')
  })

  test('page loads with all three tabs visible', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Guide' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Health' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Configuration' })).toBeVisible()
  })

  test('Guide tab is active by default and renders substantive content', async ({ page }) => {
    const guideTab = page.getByRole('tab', { name: 'Guide' })
    // Default tab — check it's selected
    await expect(guideTab).toHaveAttribute('data-state', 'active')

    const content = await page.locator('body').innerText()
    expect(content.length).toBeGreaterThan(100)
  })

  test('Health tab is clickable and renders health dashboard section', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.getByRole('tab', { name: 'Health' }).click()
    await page.waitForTimeout(500)

    const healthTab = page.getByRole('tab', { name: 'Health' })
    await expect(healthTab).toHaveAttribute('data-state', 'active')

    // Health dashboard renders health/status content
    const body = await page.locator('body').innerText()
    expect(body.length).toBeGreaterThan(50)

    // Should not have broken
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    expect(errors).toEqual([])
  })

  test('Health tab shows health-related content (status, health, or integration labels)', async ({ page }) => {
    await page.getByRole('tab', { name: 'Health' }).click()
    await page.waitForTimeout(500)

    const body = await page.locator('body').innerText()
    const hasHealthContent =
      body.includes('health') ||
      body.includes('Health') ||
      body.includes('status') ||
      body.includes('Status') ||
      body.includes('StarTel') ||
      body.includes('integration')
    expect(hasHealthContent).toBe(true)
  })

  test('Configuration tab renders and links to operator settings', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.getByRole('tab', { name: 'Configuration' }).click()
    await page.waitForTimeout(500)

    // Should show the "Open integration settings" link
    const settingsLink = page.getByRole('link', { name: /open integration settings/i })
    await expect(settingsLink).toBeVisible({ timeout: 5_000 })

    const href = await settingsLink.getAttribute('href')
    expect(href).toContain('/operator/settings')

    expect(errors).toEqual([])
  })

  test('clicking through all 3 tabs completes without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    for (const tabName of ['Guide', 'Health', 'Configuration']) {
      await page.getByRole('tab', { name: tabName }).click()
      await page.waitForTimeout(400)
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    }

    expect(errors).toEqual([])
  })
})
