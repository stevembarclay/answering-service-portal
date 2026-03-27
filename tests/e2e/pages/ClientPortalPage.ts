import type { Locator, Page } from '@playwright/test'

export class ClientPortalPage {
  constructor(private readonly page: Page) {}

  async gotoDashboard() {
    await this.page.goto('/answering-service/dashboard')
  }

  async gotoMessages() {
    await this.page.goto('/answering-service/messages')
  }

  async gotoBilling() {
    await this.page.goto('/answering-service/billing')
  }

  async gotoSettings() {
    await this.page.goto('/answering-service/settings')
  }

  isOnDashboard(): boolean {
    return this.page.url().includes('/answering-service/dashboard')
  }

  navItems(): Locator {
    return this.page.getByRole('navigation').getByRole('link')
  }

  async gotoSetup() {
    await this.page.goto('/answering-service/setup')
  }

  async gotoOnCall() {
    await this.page.goto('/answering-service/on-call')
  }
}
