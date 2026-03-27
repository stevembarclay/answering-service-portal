import { test, expect } from '@playwright/test'

test.describe('Operator usage', () => {
  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/operator/usage')
    await page.waitForLoadState('networkidle')

    expect(errors).toEqual([])
  })
})
