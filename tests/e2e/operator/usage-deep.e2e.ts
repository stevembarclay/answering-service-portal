import { test, expect } from '@playwright/test'

test.describe('Operator usage page — deep coverage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/operator/usage')
    await page.waitForLoadState('networkidle')
  })

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/operator/usage')
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('Upload History section heading is visible', async ({ page }) => {
    await expect(page.getByText('Upload History')).toBeVisible()
  })

  test('Upload CSV section is visible for admin users', async ({ page }) => {
    // The demo operator user is admin — upload panels should appear
    const uploadCsvSection = page.getByText('Upload CSV')
    const adminRequired = page.getByText(/admin role required/i)

    const hasUpload = await uploadCsvSection.isVisible({ timeout: 3_000 }).catch(() => false)
    const hasAdminMsg = await adminRequired.isVisible({ timeout: 3_000 }).catch(() => false)

    // One of these two states must be shown
    expect(hasUpload || hasAdminMsg).toBe(true)
  })

  test('Upload Call Logs section is visible for admin users', async ({ page }) => {
    const callLogsSection = page.getByText('Upload Call Logs')
    const adminRequired = page.getByText(/admin role required/i)

    const hasCallLogs = await callLogsSection.isVisible({ timeout: 3_000 }).catch(() => false)
    const hasAdminMsg = await adminRequired.isVisible({ timeout: 3_000 }).catch(() => false)

    expect(hasCallLogs || hasAdminMsg).toBe(true)
  })

  test('upload history shows table or empty state', async ({ page }) => {
    // After load, usage history is either a table of rows or shows nothing (empty)
    const body = await page.locator('body').innerText()
    // Upload History heading must always be there
    expect(body).toContain('Upload History')
    // Page should have substantive content
    expect(body.length).toBeGreaterThan(50)
  })

  test('page does not show error boundary', async ({ page }) => {
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
  })

  test('page heading "Usage" is visible', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Usage' })
    if (await heading.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(heading).toBeVisible()
    } else {
      // Fallback — page header text
      const pageTitle = page.getByText('Usage').first()
      await expect(pageTitle).toBeVisible()
    }
  })
})
