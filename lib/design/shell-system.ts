/**
 * Shell System — Page and section content wrapper patterns.
 * Every app/(app)/ page wraps its content in one of these shells.
 * Use these tokens to ensure consistent padding across all pages.
 *
 * The app background color is already set at layout.tsx level.
 * Do NOT re-apply bg color in page shells.
 */
import { cn } from '@/lib/utils/cn'
import { pageLayout } from './spacing-system'
import { warmPalette } from './color-system'

/**
 * App page content shells.
 * Wrap the root content div on every app/(app)/ page with one of these.
 */
export const appShell = {
  /**
   * Standard app page — wide content area, generous 27" padding.
   * Use on: Dashboard, main list pages, primary feature pages.
   */
  page: cn(
    'w-full',
    pageLayout.wideMaxWidth,
    'px-10 py-8',
    'max-xl:px-6 max-xl:py-6',
    'max-md:px-4 max-md:py-4',
    'space-y-10',
  ),

  /**
   * Narrow content — settings forms, single-column config pages.
   * Use on: Settings sub-pages, admin config.
   */
  narrow: cn(
    'w-full',
    pageLayout.contentMaxWidth,
    'px-8 py-8',
    'max-xl:px-5 max-xl:py-6',
    'space-y-8',
  ),

  /**
   * Full-width — split panels, triage views, review layouts.
   * Use on: Split-panel views, PDF review, side-by-side layouts.
   * No max-width constraint.
   */
  fullWidth: cn(
    'w-full px-6 py-6',
    'max-md:px-4 max-md:py-4',
  ),

  /**
   * Section separator within a page (not PageHeader — for mid-page sections).
   */
  sectionDivider: warmPalette.separator,
} as const
