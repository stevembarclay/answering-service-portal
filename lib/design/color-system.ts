/**
 * Color System — Institutional-Grade Design
 *
 * Brand color tokens — customize these to match your brand palette.
 *
 * Semantic status palette with gradient backgrounds and multi-layer shadow system.
 * The status colors (emerald/amber/rose/blue) are intentionally Tailwind-based and
 * universal — only replace the brand-specific values in warmPalette.
 */

import { cn } from '@/lib/utils/cn'

export const statusColors = {
  success: {
    // Linked/Approved — emerald is more sophisticated than green
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: 'text-emerald-600',
    dot: 'bg-emerald-500',
    hoverBg: 'hover:bg-emerald-100',
    gradient: 'from-emerald-50 to-emerald-100/50',
    shadow: 'shadow-emerald-100/50',
  },
  warning: {
    // Stale/Aging — refined amber (deeper than yellow)
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: 'text-amber-700',
    dot: 'bg-amber-500',
    hoverBg: 'hover:bg-amber-100',
    gradient: 'from-amber-50 to-amber-100/50',
    shadow: 'shadow-amber-100/50',
  },
  error: {
    // Unlinked/Issues — rose instead of harsh red
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    icon: 'text-rose-600',
    dot: 'bg-rose-500',
    hoverBg: 'hover:bg-rose-100',
    gradient: 'from-rose-50 to-rose-100/50',
    shadow: 'shadow-rose-100/50',
  },
  info: {
    // Flagged/Detection — blue for informational
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-600',
    dot: 'bg-blue-500',
    hoverBg: 'hover:bg-blue-100',
    gradient: 'from-blue-50 to-blue-100/50',
    shadow: 'shadow-blue-100/50',
  },
  neutral: {
    // Default/Secondary — refined slate
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    icon: 'text-slate-600',
    dot: 'bg-slate-400',
    hoverBg: 'hover:bg-slate-100',
    gradient: 'from-slate-50 to-slate-100/50',
    shadow: 'shadow-slate-100/50',
  },
} as const

/**
 * Enhanced badge variants with gradients and shadows
 */
export const badgeVariants = {
  success: cn(
    'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
    'text-emerald-700 border border-emerald-200',
    'shadow-sm shadow-emerald-100/50',
    'font-semibold',
  ),
  warning: cn(
    'bg-gradient-to-br from-amber-50 to-amber-100/50',
    'text-amber-800 border border-amber-200',
    'shadow-sm shadow-amber-100/50',
    'font-semibold',
  ),
  error: cn(
    'bg-gradient-to-br from-rose-50 to-rose-100/50',
    'text-rose-700 border border-rose-200',
    'shadow-sm shadow-rose-100/50',
    'font-semibold',
  ),
  info: cn(
    'bg-gradient-to-br from-blue-50 to-blue-100/50',
    'text-blue-700 border border-blue-200',
    'shadow-sm shadow-blue-100/50',
    'font-semibold',
  ),
  default: cn(
    'bg-gradient-to-br from-slate-50 to-slate-100/50',
    'text-slate-700 border border-slate-200',
    'shadow-sm shadow-slate-100/50',
    'font-semibold',
  ),
  secondary: cn(
    'bg-gradient-to-br from-slate-50 to-slate-100/50',
    'text-slate-600 border border-slate-200',
    'shadow-sm shadow-slate-100/50',
  ),
  outline: cn(
    'text-slate-700 border border-slate-300 bg-transparent',
  ),
} as const

/**
 * Border styles with subtle depth
 */
export const borderStyles = {
  // Standard card borders
  card: 'border border-slate-200/80',  // Slightly transparent for layering

  // Input borders
  input: 'border border-slate-300',

  // Dividers
  divider: 'border-t border-slate-200',

  // Premium glow border (for featured elements)
  glow: 'border-glow',  // From globals.css (gradient border on hover)
} as const

/**
 * Shadow system — uses premium utilities from globals.css
 */
export const shadowStyles = {
  // Multi-layer institutional shadow
  institutional: 'shadow-institutional',
  institutionalHover: 'shadow-institutional-hover',

  // Standard shadows
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',

  // Colored shadows for badges/buttons
  success: 'shadow-sm shadow-emerald-100/50',
  warning: 'shadow-sm shadow-amber-100/50',
  error: 'shadow-sm shadow-rose-100/50',
  info: 'shadow-sm shadow-blue-100/50',
} as const

/**
 * Button variants with premium styling
 */
export const buttonVariants = {
  primary: cn(
    'bg-primary text-primary-foreground',
    'hover:opacity-90',
    'hover:scale-[1.02]',
    'active:scale-[0.98]',
    'transition-all duration-200 ease-out',
  ),

  secondary: cn(
    'bg-slate-100 border-2 border-slate-200',
    'text-slate-700 font-semibold',
    'hover:bg-slate-50 hover:border-slate-300',
    'shadow-sm hover:shadow-md',
    'transition-all duration-200 ease-out',
  ),

  outline: cn(
    'border-2 border-primary bg-transparent',
    'text-primary font-semibold',
    'hover:bg-primary/5',
    'shadow-sm hover:shadow-md',
    'transition-all duration-200 ease-out',
  ),

  ghost: cn(
    'hover:bg-slate-100 text-slate-700',
    'transition-all duration-200 ease-out',
  ),

  destructive: cn(
    'bg-gradient-to-br from-rose-600 to-rose-700',
    'text-white font-semibold',
    'shadow-sm shadow-rose-600/20',
    'hover:shadow-md hover:shadow-rose-600/30',
    'hover:scale-[1.02]',
    'active:scale-[0.98]',
    'transition-all duration-200 ease-out',
  ),
} as const

/**
 * App background palette — for components rendered on the app background color.
 * Card borders, separators, and text on the app bg use these tokens.
 */
export const warmPalette = {
  /** Card border on app bg */
  border: 'border-slate-200',
  /** Inline borderColor value for style={{ borderColor }} contexts */
  borderColor: '#e2e8f0',
  /**
   * Page-level separator color (PageHeader bottom border).
   */
  separatorColor: '#cbd5e1',
  /** Section separator */
  separator: 'border-b pb-6 mb-6 border-slate-200',
  /** Primary text on app bg (page titles) */
  textClass: 'text-slate-900',
  /** Secondary text on app bg (subtitles) */
  subtextClass: 'text-slate-500',
} as const
