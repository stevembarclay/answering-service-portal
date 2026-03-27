import type { Page } from '@playwright/test'

export class SettingsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/answering-service/settings')
  }

  keyLabelInput() {
    return this.page.getByPlaceholder('Key label')
  }

  createKeyButton() {
    return this.page.getByRole('button', { name: 'Create key' })
  }

  revokeButton(label: string) {
    return this.page
      .getByText(label)
      .locator('..')
      .locator('..')
      .getByRole('button', { name: 'Revoke' })
  }

  keyLabelText(label: string) {
    return this.page.getByText(label)
  }

  /** Message statuses section */
  messageStatusesSection() {
    return this.page.getByText(/message status/i).first()
  }

  /** Account section */
  accountSection() {
    return this.page.getByText('Account').first()
  }
}
