/**
 * Overlay System — Dialog (Modal) and Sheet/Drawer token patterns.
 * Use on all modal and drawer components to enforce warm palette
 * consistency and eliminate the cool-slate default border pattern.
 *
 * NOTE: These are className strings for use with shadcn DialogContent,
 * SheetContent, etc. Override shadcn defaults via className prop.
 */
import { cn } from '@/lib/utils/cn'
import { warmPalette } from './color-system'

export const dialogStyles = {
  /** Dialog container override (for shadcn DialogContent className) */
  container: cn(
    'bg-white rounded-xl shadow-2xl',
    warmPalette.border,
  ),

  /** Dialog header area (title + description) */
  header: cn(
    'px-6 pt-6 pb-4',
    warmPalette.separator,
  ),

  /** Dialog scrollable content area */
  content: 'px-6 py-5',

  /** Dialog footer — right-aligned buttons (affirmative LEFT, cancel RIGHT per UX rules) */
  footer: cn(
    'px-6 py-4',
    warmPalette.border,
    'border-t',
    'flex items-center justify-end gap-3',
  ),

  /** Dialog footer — full-width with destructive action on left */
  footerDestructive: cn(
    'px-6 py-4',
    warmPalette.border,
    'border-t',
    'flex items-center justify-between gap-3',
  ),
} as const

export const sheetStyles = {
  /** Sheet/Drawer right-side container */
  container: cn(
    'bg-white shadow-2xl',
    `border-l border-[${warmPalette.borderColor}]`,
  ),

  /** Sheet header */
  header: cn(
    'px-6 pt-6 pb-4',
    `border-b border-[${warmPalette.borderColor}]`,
  ),

  /** Sheet scrollable content */
  content: 'px-6 py-5 overflow-y-auto',

  /** Sheet footer */
  footer: cn(
    'px-6 py-4',
    `border-t border-[${warmPalette.borderColor}]`,
    'flex items-center gap-3',
  ),
} as const

/** Overlay backdrop styles */
export const backdropStyles = {
  standard: 'bg-black/40 backdrop-blur-[2px]',
  heavy: 'bg-black/60 backdrop-blur-[4px]',
} as const
