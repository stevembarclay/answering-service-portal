import type { Page } from '@playwright/test'

export class BillingPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/answering-service/billing')
    // BillingClient fetches data client-side; wait for the skeleton to resolve
    await this.page.waitForLoadState('networkidle')
    // Give the client-side fetch extra time to complete
    await this.page.waitForTimeout(1500)
  }

  /** Main page heading */
  heading() {
    return this.page.getByRole('heading', { name: 'Billing' })
  }

  /** Running estimate / period summary card */
  estimatedTotal() {
    return this.page.getByText('Estimated Total').first()
  }

  /** Invoice history section header */
  invoiceHistoryHeading() {
    return this.page.getByText('Invoice History').first()
  }

  /** Invoice row buttons (each invoice is a button inside the list) */
  invoiceRowButtons() {
    return this.page.getByRole('button').filter({ hasText: /202[0-9]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i })
  }
}
