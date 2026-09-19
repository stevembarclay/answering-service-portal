import type { Page } from '@playwright/test'

export class OperatorClientsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/operator/clients')
  }

  heading() {
    return this.page.getByRole('heading', { name: 'Clients' })
  }

  clientByName(name: string) {
    return this.page.getByText(name)
  }

  async clickFirstClient() {
    await this.page.getByRole('link', { name: /view →/i }).first().click()
    await this.page.waitForURL(/\/operator\/clients\/.+/)
  }
}
