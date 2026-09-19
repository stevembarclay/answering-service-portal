// Community edition — usage alert and digest emails are available in the managed platform.
// Invite emails are handled by inviteService.ts via Supabase Auth.

export interface ThresholdAlertOptions {
  operatorOrgId: string
  businessId: string
  thresholdPercent: number
  totalMinutes: number
  includedMinutes: number
}

/**
 * No-op in the community edition.
 * Billing threshold alert emails are a managed platform feature.
 * Usage data is tracked and visible in the portal; automated alerts require the managed platform.
 */
export async function sendThresholdAlertEmail(_opts: ThresholdAlertOptions): Promise<void> {
  // Intentional no-op — threshold alert emails are a managed platform feature.
}
