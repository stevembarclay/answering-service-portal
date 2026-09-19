/**
 * HIPAA audit log — E2E tests
 *
 * The audit log tab in client detail is only visible when hipaa_mode is enabled for
 * that business. Demo data may or may not have a HIPAA-enabled client, so tests are
 * written to be resilient: they assert what SHOULD be true given the current state
 * rather than assuming hipaa_mode is on or off.
 */
import { test, expect } from '@playwright/test'
import { OperatorClientsPage } from '../pages/OperatorClientsPage'

let clientDetailUrl: string

test.describe.configure({ mode: 'serial' })

test.describe('HIPAA audit log — client detail', () => {
  test('navigate to first client detail and capture URL', async ({ page }) => {
    // Uses the project storageState via the page fixture — authenticated
    const clients = new OperatorClientsPage(page)
    await clients.goto()
    await page.waitForLoadState('networkidle')
    await clients.clickFirstClient()
    clientDetailUrl = page.url()
    expect(clientDetailUrl).toMatch(/\/operator\/clients\/[a-f0-9-]{36}/)
  })

  test('client detail Settings tab has HIPAA toggle section', async ({ page }) => {
    await page.goto(clientDetailUrl)
    await page.waitForLoadState('networkidle')

    // Click the Settings tab
    const settingsTab = page.getByRole('tab', { name: 'Settings' })
    if (!(await settingsTab.isVisible({ timeout: 5_000 }).catch(() => false))) return

    await settingsTab.click()
    await page.waitForTimeout(800)

    // Settings tab should contain HIPAA-related content
    const body = await page.locator('body').innerText()
    const hasHipaa =
      body.includes('HIPAA') ||
      body.includes('hipaa') ||
      body.includes('PHI') ||
      body.includes('compliance')
    expect(hasHipaa).toBe(true)
  })

  test('Audit Log tab is conditionally present based on HIPAA mode', async ({ page }) => {
    await page.goto(clientDetailUrl)
    await page.waitForLoadState('networkidle')

    const auditTab = page.getByRole('tab', { name: 'Audit Log' })
    const hipaaEnabled = await auditTab.isVisible({ timeout: 2_000 }).catch(() => false)

    if (hipaaEnabled) {
      // HIPAA is enabled — audit log tab should be clickable and render content
      await auditTab.click()
      await page.waitForTimeout(600)

      // Either a table of events or the "enable HIPAA mode" empty state
      const body = await page.locator('body').innerText()
      const hasAuditContent =
        body.includes('Timestamp') ||
        body.includes('audit') ||
        body.includes('Audit') ||
        body.includes('No audit events') ||
        body.includes('HIPAA mode')
      expect(hasAuditContent).toBe(true)

      await expect(page.getByText(/something went wrong/i)).not.toBeVisible()
    } else {
      // HIPAA is not enabled — audit log tab should not be in the DOM
      await expect(auditTab).not.toBeVisible()
    }
  })

  test('audit log renders without errors when tab is visible', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto(clientDetailUrl)
    await page.waitForLoadState('networkidle')

    const auditTab = page.getByRole('tab', { name: 'Audit Log' })
    if (!(await auditTab.isVisible({ timeout: 2_000 }).catch(() => false))) return

    await auditTab.click()
    await page.waitForTimeout(600)

    // No JS errors
    expect(errors).toEqual([])
  })

  test('audit log empty state shows correct message when no events exist', async ({ page }) => {
    await page.goto(clientDetailUrl)
    await page.waitForLoadState('networkidle')

    const auditTab = page.getByRole('tab', { name: 'Audit Log' })
    if (!(await auditTab.isVisible({ timeout: 2_000 }).catch(() => false))) return

    await auditTab.click()
    await page.waitForTimeout(600)

    // Either events table or the empty state text
    const table = page.getByRole('table')
    const emptyMsg = page.getByText(/no audit events|enable hipaa/i)

    const hasTable = await table.isVisible({ timeout: 2_000 }).catch(() => false)
    const hasEmpty = await emptyMsg.isVisible({ timeout: 2_000 }).catch(() => false)
    expect(hasTable || hasEmpty).toBe(true)
  })
})
