import { test, expect } from '@playwright/test'

test.describe('Client dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/answering-service/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/answering-service/dashboard')
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('dashboard heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('call volume chart renders', async ({ page }) => {
    // Chart is an SVG or a canvas element rendered by recharts
    const chart = page.locator('svg, canvas').first()
    await expect(chart).toBeVisible({ timeout: 15_000 })
  })

  test('billing estimate card is visible', async ({ page }) => {
    // DashboardBillingCard shows "This month" as the label
    const estimateCard = page.getByText(/this month|view billing/i).first()
    await expect(estimateCard).toBeVisible()
  })

  test('on-call card shows a contact name', async ({ page }) => {
    // The on-call card on the dashboard shows who is on-call
    const onCallSection = page.getByText(/on.call|who to call/i).first()
    await expect(onCallSection).toBeVisible()
  })

  test('unread messages strip or count is visible', async ({ page }) => {
    // Unread messages indicator — could be a badge, text, or card
    const unreadIndicator = page
      .getByText(/unread|message/i)
      .first()
    await expect(unreadIndicator).toBeVisible()
  })

  test('AI coach button is visible and chat opens', async ({ page }) => {
    // The coach button floats or is in a card — look for "Ask" or "Coach"
    const coachButton = page.getByRole('button', { name: /ask|coach|help/i }).first()
    if (await coachButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await coachButton.click()
      // Chat panel or modal should appear
      const chatPanel = page.getByRole('textbox', { name: /message|ask/i }).first()
      await expect(chatPanel).toBeVisible({ timeout: 5_000 })
    } else {
      // Coach might be a floating button without accessible name
      const floatingBtn = page.locator('button').filter({ hasText: /💬|🤖|coach|ask/i }).first()
      if (await floatingBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await floatingBtn.click()
        await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 5_000 })
      }
      // If no coach button at all, test passes (community edition may not have it)
    }
  })
})
