import type { Page } from '@playwright/test'

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async signIn(email: string, password: string) {
    await this.page.getByLabel('Email address').fill(email)
    await this.page.getByLabel('Password').fill(password)
    await this.page.getByRole('button', { name: 'Sign in' }).click()
    await this.page.waitForURL((url) => !url.pathname.startsWith('/login'))
    await this.page.waitForLoadState('networkidle')
  }

  async signInAsClient() {
    await this.signIn(
      process.env.TEST_CLIENT_EMAIL ?? 'demo@example.com',
      process.env.TEST_CLIENT_PASSWORD ?? 'demo-password-2026',
    )
  }

  async signInAsOperator() {
    await this.signIn(
      process.env.TEST_OPERATOR_EMAIL ?? 'operator@example.com',
      process.env.TEST_OPERATOR_PASSWORD ?? 'operator-password-2026',
    )
  }

  async signInRaw(email: string, password: string) {
    await this.page.getByLabel('Email address').fill(email)
    await this.page.getByLabel('Password').fill(password)
    await this.page.getByRole('button', { name: 'Sign in' }).click()
    // No waitForURL — caller handles assertion (used for failed-login test)
  }
}
