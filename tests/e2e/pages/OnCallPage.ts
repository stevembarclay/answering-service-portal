import type { Page } from '@playwright/test'

export class OnCallPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/answering-service/on-call')
  }

  heading() {
    // The client portal on-call page heading is "On-Call Schedule"
    return this.page.getByRole('heading', { name: 'On-Call Schedule' })
  }

  shiftsTab() {
    return this.page.getByRole('tab', { name: 'Shifts' })
  }

  contactsTab() {
    return this.page.getByRole('tab', { name: 'Contacts' })
  }

  async clickContactsTab() {
    await this.contactsTab().click()
  }

  async clickShiftsTab() {
    await this.shiftsTab().click()
  }
}
