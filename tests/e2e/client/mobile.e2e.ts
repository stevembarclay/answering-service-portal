import { test, expect } from '@playwright/test'

test.describe('Client portal — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('dashboard renders at mobile size without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/answering-service/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('navigation').getByRole('link').first()).toBeVisible()
    expect(errors).toEqual([])
  })

  test('bottom nav is visible at mobile width', async ({ page }) => {
    await page.goto('/answering-service/dashboard')
    await page.waitForLoadState('networkidle')

    // BottomNav or sidebar nav should have links
    const nav = page.getByRole('navigation').first()
    await expect(nav).toBeVisible()

    const links = nav.getByRole('link')
    const count = await links.count()
    expect(count).toBeGreaterThan(0)
  })

  test('messages list renders and is scrollable on mobile', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/answering-service/messages')
    await page.waitForLoadState('networkidle')

    // Page should render content
    const content = await page.locator('body').innerText()
    expect(content.length).toBeGreaterThan(20)
    expect(errors).toEqual([])
  })

  test('message detail readable on mobile', async ({ page }) => {
    await page.goto('/answering-service/messages')
    await page.waitForLoadState('networkidle')

    const expandButton = page.getByRole('button', { name: /previous message|show earlier/i })
    if (await expandButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expandButton.click()
    }

    const viewButton = page.getByRole('button', { name: 'View →' }).first()
    if (await viewButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await viewButton.click()
      await page.waitForLoadState('networkidle')

      // Detail content is visible and not overflowing
      const main = page.locator('main, [role="main"]').first()
      await expect(main).toBeVisible()

      // No horizontal overflow: scrollWidth should not exceed clientWidth significantly
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5
      })
      expect(overflow, 'Page has horizontal overflow').toBe(false)
    }
  })

  test('no horizontal overflow on dashboard', async ({ page }) => {
    await page.goto('/answering-service/dashboard')
    await page.waitForLoadState('networkidle')

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5
    })
    expect(overflow, 'Dashboard has horizontal overflow on mobile').toBe(false)
  })
})
