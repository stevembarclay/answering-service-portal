// lib/config/portal.ts
// All white-label configuration. Components import from here — never from process.env directly.

/** Validates that a string is a CSS hex color. Falls back to default if invalid. */
function sanitizeBrandColor(value: string | undefined): string {
  if (value && /^#[0-9a-fA-F]{3,8}$/.test(value)) {
    return value
  }
  return '#334155'
}

export const portalConfig = {
  name: process.env.PORTAL_NAME ?? 'Answering Service Portal',
  logoUrl: process.env.PORTAL_LOGO_URL,          // undefined if not set — use as boolean check
  // PORTAL_BRAND_COLOR must be a CSS hex color (#rgb, #rrggbb) dark enough
  // that white (#fff) text achieves 4.5:1 contrast.
  // Verify at: https://webaim.org/resources/contrastchecker/
  brandColor: sanitizeBrandColor(process.env.PORTAL_BRAND_COLOR),
  supportEmail: process.env.PORTAL_SUPPORT_EMAIL ?? 'support@example.com',
} as const

export type PortalConfig = typeof portalConfig
