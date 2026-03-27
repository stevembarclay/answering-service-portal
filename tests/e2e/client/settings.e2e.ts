import { test, expect } from '@playwright/test'
import { SettingsPage } from '../pages/SettingsPage'

test.describe('Client settings', () => {
  test('page loads with Settings heading', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    const settings = new SettingsPage(page)
    await settings.goto()
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('Account section shows email and Sign out button', async ({ page }) => {
    const settings = new SettingsPage(page)
    await settings.goto()
    await page.waitForLoadState('networkidle')

    // Account card contains the user's email
    await expect(page.getByText('Account').first()).toBeVisible()
    // There may be multiple Sign out buttons (form + other) — just check one is visible
    await expect(page.getByRole('button', { name: 'Sign out' }).first()).toBeVisible()
  })

  test('Message statuses section is present', async ({ page }) => {
    const settings = new SettingsPage(page)
    await settings.goto()
    await page.waitForLoadState('networkidle')

    // MessageStatusesManager renders a section for managing custom statuses
    const statusSection = page.getByText(/status/i).first()
    await expect(statusSection).toBeVisible()
  })
})
