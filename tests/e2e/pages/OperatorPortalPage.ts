import type { Page } from '@playwright/test'

export class OperatorPortalPage {
  constructor(private readonly page: Page) {}

  async gotoClients() {
    await this.page.goto('/operator/clients')
  }

  async gotoUsage() {
    await this.page.goto('/operator/usage')
  }

  async gotoApiWebhooks() {
    await this.page.goto('/operator/api-webhooks')
  }

  async gotoSettings() {
    await this.page.goto('/operator/settings')
  }

  async gotoActivity() {
    await this.page.goto('/operator/activity')
  }

  async gotoAnalytics() {
    await this.page.goto('/operator/analytics')
  }

  async gotoBilling() {
    await this.page.goto('/operator/billing')
  }

  async gotoIntegrations() {
    await this.page.goto('/operator/integrations')
  }

  async gotoBillingTemplates() {
    await this.page.goto('/operator/billing-templates')
  }

  isOnClients(): boolean {
    return this.page.url().includes('/operator/clients')
  }

  async clientRowCount(): Promise<number> {
    return this.page.getByRole('table').getByRole('row').count()
  }
}
