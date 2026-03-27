import { test, expect } from '@playwright/test'

test.describe('Operator portal — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('clients page renders at mobile size without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/operator/clients')
    await page.waitForLoadState('networkidle')

    // At least one element is visible (page did not blank out)
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible()

    expect(errors).toEqual([])
  })
})
