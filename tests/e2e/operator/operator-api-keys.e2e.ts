import { test, expect } from '@playwright/test'
import { SettingsPage } from '../pages/SettingsPage'

test.describe('Operator API keys', () => {
  test('page loads', async ({ page }) => {
    await page.goto('/operator/api-webhooks')
    await page.waitForLoadState('networkidle')
    // API key manager is present on this page
    await expect(page.getByPlaceholder('Key label')).toBeVisible()
  })

  test('can create and revoke an operator API key', async ({ page }) => {
    // Reuse SettingsPage selectors — same ApiKeyManager component
    const settings = new SettingsPage(page)
    await page.goto('/operator/api-webhooks')
    await page.waitForLoadState('networkidle')

    const label = `e2e-op-${Date.now()}`

    // Create
    await settings.keyLabelInput().fill(label)
    await settings.createKeyButton().click()

    // Dismiss the confirmation
    await page.getByRole('button', { name: "I've saved it" }).click()

    // The key list is server-rendered; reload so the new key appears in the list
    await page.goto('/operator/api-webhooks')
    await page.waitForLoadState('networkidle')

    // Key label visible in list
    await expect(settings.keyLabelText(label)).toBeVisible()

    // Revoke
    await settings.revokeButton(label).click()
    await expect(settings.keyLabelText(label)).not.toBeVisible()
  })
})
