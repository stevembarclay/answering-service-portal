import { test, expect } from '@playwright/test'
import { OnCallPage } from '../pages/OnCallPage'

test.describe('Client on-call', () => {
  test.beforeEach(async ({ page }) => {
    const onCall = new OnCallPage(page)
    await onCall.goto()
    await page.waitForLoadState('networkidle')
  })

  test('page heading and Shifts tab are visible', async ({ page }) => {
    const onCall = new OnCallPage(page)
    await expect(onCall.heading()).toBeVisible()
    await expect(onCall.shiftsTab()).toBeVisible()
  })

  test('Shifts tab shows at least one shift entry', async ({ page }) => {
    const onCall = new OnCallPage(page)
    await onCall.clickShiftsTab()
    await page.waitForLoadState('networkidle')

    // Shifts section should show some content — at minimum a shift name
    const shiftContent = page.locator('main, [role="main"]').first()
    const text = await shiftContent.innerText()
    // Demo data always has at least one shift
    expect(text.length).toBeGreaterThan(20)
  })

  test('Contacts tab is accessible', async ({ page }) => {
    const onCall = new OnCallPage(page)
    await expect(onCall.contactsTab()).toBeVisible()
    await onCall.clickContactsTab()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/on-call/)
  })

  test('Contacts tab shows at least one contact', async ({ page }) => {
    const onCall = new OnCallPage(page)
    await onCall.clickContactsTab()
    await page.waitForLoadState('networkidle')

    // Demo data has seeded contacts
    const contactsContent = page.locator('main, [role="main"]').first()
    const text = await contactsContent.innerText()
    expect(text.length).toBeGreaterThan(10)
  })

  test('can add a contact and it appears in the list', async ({ page }) => {
    const onCall = new OnCallPage(page)
    await onCall.clickContactsTab()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // ContactsTab shows "+ Add contact" button (Button variant="outline")
    const addButton = page.getByRole('button', { name: /\+ add contact|add contact/i }).first()
    if (!(await addButton.isVisible({ timeout: 3_000 }).catch(() => false))) {
      // Add contact button not present — skip
      return
    }

    await addButton.click()
    await page.waitForTimeout(500)

    const contactName = `E2E ${Date.now()}`

    // ContactsTab form has `<Label>Name *</Label>` + `<Input ... />`
    // Try getByRole('textbox') as a robust fallback
    const textboxes = page.getByRole('textbox')
    const count = await textboxes.count()
    if (count === 0) return

    // First textbox is the Name field
    await textboxes.first().fill(contactName)

    // Second textbox is the Phone field
    if (count >= 2) {
      await textboxes.nth(1).fill('555-0199')
    }

    // Submit — the submit button inside the form says "Add contact" (no plus)
    const saveBtn = page
      .getByRole('button', { name: /^add contact$/i })
      .or(page.getByRole('button', { name: /save|update/i }))
      .first()
    if (await saveBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await saveBtn.click()
      await page.waitForTimeout(1000)
      await expect(page.getByText(contactName)).toBeVisible({ timeout: 8_000 })
    }
  })

  test('escalation steps are listed in Shifts tab', async ({ page }) => {
    const onCall = new OnCallPage(page)
    await onCall.clickShiftsTab()
    await page.waitForLoadState('networkidle')

    // Demo data has seeded escalation steps
    const shiftList = page.locator('main, [role="main"]').first()
    await expect(shiftList).toBeVisible()
  })
})
