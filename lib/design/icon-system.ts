/**
 * Icon System — Institutional-Grade Design
 *
 * Defines consistent icon sizing, visual weights, and status configurations
 * across the application.
 */

export const iconSizes = {
  xs: 14,    // Inline text icons, timestamps, metadata
  sm: 16,    // List items, secondary actions
  md: 20,    // Card headers, primary actions, navigation
  lg: 24,    // Page headers, featured elements
  xl: 32,    // Empty states, hero sections, illustrations
} as const

export const iconWeights = {
  recessive: 'text-slate-400',      // Background/metadata icons (file types, timestamps)
  neutral: 'text-slate-600',         // Standard icons (most UI elements)
  prominent: 'text-slate-900',       // Active/important icons (selected state)
  brand: 'text-primary',             // Brand color icons (navigation active state)
  status: {
    success: 'text-emerald-600',     // Linked, approved
    warning: 'text-amber-700',       // Stale, aging
    error: 'text-rose-600',          // Unlinked, issues
    info: 'text-blue-600',           // Flagged, detection
  }
} as const

/**
 * Enhanced status icon configurations
 * Includes icon component, colors, and background styling
 */
export const statusIcons = {
  linked: {
    className: 'text-emerald-600',
    bgClassName: 'bg-emerald-50 border border-emerald-100 rounded-full p-2',
  },
  stale: {
    className: 'text-amber-700',
    bgClassName: 'bg-amber-50 border border-amber-100 rounded-full p-2',
  },
  unlinked: {
    className: 'text-rose-600',
    bgClassName: 'bg-rose-50 border border-rose-100 rounded-full p-2',
  },
  flagged: {
    className: 'text-blue-600',
    bgClassName: 'bg-blue-50 border border-blue-100 rounded-full p-2',
  },
  empty: {
    className: 'text-slate-400',
    bgClassName: 'bg-slate-100 border border-slate-200 rounded-full p-3',
  }
} as const

/**
 * Usage Guidelines:
 *
 * - Navigation icons: md (20px)
 * - Card list icons: sm (16px)
 * - Empty state icons: xl (32px)
 * - Status badges: xs (14px)
 * - Page header icons: lg (24px)
 */
