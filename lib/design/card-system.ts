/**
 * Card System — Institutional-Grade Design
 *
 * Card variants using premium utilities from globals.css.
 * Includes interactive cards, data panels, border hover states.
 * All card borders use warmPalette.border (slate-200).
 */

import { cn } from '@/lib/utils/cn'
import { warmPalette } from './color-system'

/**
 * Card variants — USE EXISTING PREMIUM UTILITIES FROM globals.css
 *
 * Radius grammar:
 *   tableWrapper → rounded-none (0px)  — table containers, metrics bars, section wrappers
 *   static       → rounded-lg  (8px)  — content cards (dashboards, info panels, detail views)
 *   empty        → rounded-md  (6px)  — empty state containers
 *   dataPanel    → rounded-md  (6px)  — owned by .data-panel CSS; do NOT add rounded-* at call site
 *   hero         → rounded-xl  (12px) — dark surface, showcase moments
 *   interactive  → rounded-3xl (24px) — owned by .premium-card CSS; do NOT add rounded-* at call site
 *
 * Never pair cardBorderHover.* with tableWrapper — border color hover is wrong affordance
 * on a non-interactive precision container.
 */
export const cardVariants = {
  // Table/section wrapper — sharp, anchored, precision instrument
  // Use for: table containers, metrics bars, toolbar zones, full-width section wrappers
  // Do NOT use for: content cards, dashboard panels, info panels, anything with hover interaction
  tableWrapper: cn(
    'bg-white',
    warmPalette.border,
    'shadow-institutional',
    'rounded-none',
  ),

  // Interactive navigable card — the thing you click to navigate somewhere
  // .premium-card CSS owns border-radius: var(--radius-3xl) = 24px
  interactive: cn(
    'premium-card',
    warmPalette.border,
    'hover:shadow-institutional-hover',
    'transition-all duration-300 ease-smooth',
    'hover:-translate-y-1',
    'cursor-pointer',
  ),

  // Data display stat card
  // .data-panel CSS owns border-radius: var(--radius-md) = 6px
  dataPanel: cn(
    'data-panel',
    warmPalette.border,
    'hover:shadow-institutional-hover',
    'transition-all duration-300 ease-smooth',
    'cursor-pointer',
  ),

  // Static content card — dashboards, info panels, detail views (NOT table wrappers)
  static: cn(
    'bg-white',
    warmPalette.border,
    'shadow-institutional',
    'rounded-lg',
  ),

  // Empty state container
  empty: cn(
    'bg-white',
    warmPalette.border,
    'shadow-sm',
    'rounded-md',
  ),

  // Hero/featured card — dark surface for key metrics or showcase moments
  // TODO: replace bg-[#0F172A] with your primaryDark brand color
  hero: cn(
    'bg-[#0F172A] text-white',
    'border border-transparent',
    'shadow-lg',
    'rounded-xl',
    'transition-all duration-300 ease-smooth',
  ),
} as const

/**
 * Section rule — NOT a card. Use when content zones need visual separation
 * without a floating container. Replaces the anti-pattern of wrapping content
 * in cardVariants.static just to get a bottom border.
 *
 * Usage: <div className={sectionRule}>...</div>
 *        <section className={cn(sectionRule, 'space-y-4')}>...</section>
 */
export const sectionRule = cn(
  'border-b',
  warmPalette.border,
  'pb-6',
)

/**
 * Card border variants for hover states
 * Add these alongside card variants for status-specific hovers
 */
export const cardBorderHover = {
  success: 'hover:border-emerald-300/50',
  warning: 'hover:border-amber-300/50',
  error: 'hover:border-rose-300/50',
  info: 'hover:border-blue-300/50',
  neutral: 'hover:border-slate-300',
  primary: 'hover:border-primary/30',
} as const

/**
 * Usage Examples:
 *
 * // Navigable list card
 * <Card className={cn(cardVariants.interactive, cardBorderHover.neutral)}>
 *   ...
 * </Card>
 *
 * // Dashboard stat card
 * <Card className={cn(cardVariants.dataPanel, cardBorderHover.success)}>
 *   ...
 * </Card>
 *
 * // Featured metric (dark background)
 * <Card className={cardVariants.hero}>
 *   ...
 * </Card>
 */
