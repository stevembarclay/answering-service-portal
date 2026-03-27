import type { Page } from '@playwright/test'

export class OperatorClientDetailPage {
  constructor(private readonly page: Page) {}

  overviewTab() {
    return this.page.getByRole('tab', { name: 'Overview' })
  }

  billingTab() {
    return this.page.getByRole('tab', { name: 'Billing' })
  }

  callsTab() {
    return this.page.getByRole('tab', { name: 'Calls' })
  }

  analyticsTab() {
    return this.page.getByRole('tab', { name: 'Analytics' })
  }

  settingsTab() {
    return this.page.getByRole('tab', { name: 'Settings' })
  }

  async clickOverviewTab() {
    await this.overviewTab().click()
  }

  async clickBillingTab() {
    await this.billingTab().click()
  }

  async clickCallsTab() {
    await this.callsTab().click()
  }

  async clickAnalyticsTab() {
    await this.analyticsTab().click()
  }

  async clickSettingsTab() {
    await this.settingsTab().click()
  }

  /** Business name input in Settings tab */
  businessNameInput() {
    return this.page.getByLabel(/business name/i)
  }

  /** Health score section in Overview tab */
  healthScoreSection() {
    return this.page.getByText(/health score/i).first()
  }
}
