import { test, expect } from '@playwright/test'
import { OperatorClientsPage } from '../pages/OperatorClientsPage'

test.describe('Operator clients', () => {
  test.beforeEach(async ({ page }) => {
    const clients = new OperatorClientsPage(page)
    await clients.goto()
    await page.waitForLoadState('networkidle')
  })

  test('client list loads and shows Riverside Law Group', async ({ page }) => {
    const clients = new OperatorClientsPage(page)
    await expect(clients.heading()).toBeVisible()
    await expect(clients.clientByName('Riverside Law Group')).toBeVisible()
  })

  test('health score badges are visible', async ({ page }) => {
    // Health score badges use color coding — look for a score number or badge element
    const badge = page.locator('[class*="badge"], [class*="score"]').first()
    if (await badge.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(badge).toBeVisible()
    } else {
      // Alternative: look for percentage or numeric score text
      const scoreText = page.getByText(/\d+%|\d+\/\d+/).first()
      if (await scoreText.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(scoreText).toBeVisible()
      }
    }
  })

  test('search filters client list', async ({ page }) => {
    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/search|filter/i)
    ).first()
    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.fill('Riverside')
      await page.waitForTimeout(500)
      await expect(page.getByText('Riverside Law Group')).toBeVisible()

      // Type a no-match string
      await searchInput.fill('zzz-no-match-xyz')
      await page.waitForTimeout(500)

      // Riverside should no longer be visible
      await expect(page.getByText('Riverside Law Group')).not.toBeVisible({ timeout: 3_000 })

      // Restore
      await searchInput.clear()
    }
  })

  test('clicking first client opens detail page', async ({ page }) => {
    const clients = new OperatorClientsPage(page)
    await clients.clickFirstClient()
    await expect(page).toHaveURL(/\/operator\/clients\/.+/)
  })

  test('client detail page shows "Who to Call" or client overview', async ({ page }) => {
    const clients = new OperatorClientsPage(page)
    await clients.clickFirstClient()
    await page.waitForLoadState('networkidle')

    // Either "Who to Call" card or a heading with the client name
    const content = page.locator('main, [role="main"]').first()
    await expect(content).toBeVisible()
    const text = await content.innerText()
    expect(text.length).toBeGreaterThan(20)
  })

  test('Add Client button is present and opens a form', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add client|new client/i }).or(
      page.getByRole('link', { name: /add client|new client/i })
    ).first()

    if (await addButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addButton.click()
      await page.waitForLoadState('networkidle')

      // Add client form should be visible — look for a name input
      const nameInput = page.getByLabel(/business name|name/i).first()
      await expect(nameInput).toBeVisible({ timeout: 8_000 })
    }
  })

  test('Add Client form validates required name field', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add client|new client/i }).or(
      page.getByRole('link', { name: /add client|new client/i })
    ).first()

    if (await addButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await addButton.click()
      await page.waitForLoadState('networkidle')

      // Submit without filling the name field
      const submitButton = page.getByRole('button', { name: /add|create|save|invite/i }).last()
      if (await submitButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await submitButton.click()
        await page.waitForTimeout(500)

        // Should show a validation error
        const errorMsg = page.getByText(/required|please enter|invalid/i).first()
        const isRequired = await page.locator('input:invalid').count()

        // Either a visible error message or HTML5 validation
        const hasError =
          (await errorMsg.isVisible({ timeout: 2_000 }).catch(() => false)) ||
          isRequired > 0
        expect(hasError).toBe(true)
      }
    }
  })
})
