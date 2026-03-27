/**
 * Brand tokens — neutral defaults for the white-label answering service portal.
 * Interactive color identity comes from PORTAL_BRAND_COLOR (see lib/config/portal.ts).
 */

export const brandTokens = {
  primaryDark: '#0f172a',           // slate-950
  primaryMid: '#334155',            // slate-700
  interactionBlue: '#2563eb',       // kept for explicit blue contexts
  interactionBlueHover: '#1d4ed8',

  // App background palette
  backgroundApp: '#f8fafc',         // slate-50
  borderApp: '#e2e8f0',             // slate-200
  textPrimary: '#0f172a',           // slate-950
  textSecondary: '#64748b',         // slate-500
} as const
