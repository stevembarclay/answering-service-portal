/**
 * Table System — Consistent table container, header, row, and cell patterns.
 * Apply to all data tables in components/.
 */
import { cn } from '@/lib/utils/cn'
import { warmPalette } from './color-system'

export const tableStyles = {
  /** Outer container — rounded corners, warm border, institutional shadow */
  container: cn(
    'w-full overflow-hidden rounded-lg',
    warmPalette.border,
    'bg-white shadow-institutional',
  ),

  /** <thead> element */
  head: cn(
    'bg-slate-50/80',
    'border-b border-slate-200',
  ),

  /** <th> element */
  th: cn(
    'px-4 py-3 text-left',
    'text-xs font-semibold text-slate-500 uppercase tracking-wide',
    'whitespace-nowrap',
  ),

  /** Sortable <th> — clickable column header */
  thSortable: cn(
    'px-4 py-3 text-left',
    'text-xs font-semibold text-slate-500 uppercase tracking-wide',
    'whitespace-nowrap cursor-pointer select-none',
    'hover:text-slate-700 transition-colors duration-150',
  ),

  /** <tr> element (static row) */
  row: cn(
    'border-b border-slate-100 last:border-0',
    'hover:bg-slate-50/50 transition-colors duration-150',
  ),

  /** <tr> element (clickable row) */
  rowClickable: cn(
    'border-b border-slate-100 last:border-0',
    'hover:bg-slate-50 transition-colors duration-150 cursor-pointer',
  ),

  /** Standard <td> */
  cell: 'px-4 py-3.5 text-sm text-slate-700',

  /** Mono / numeric <td> (hashes, IDs, counts) */
  cellMono: 'px-4 py-3.5 text-xs font-mono text-slate-500 tabular-nums',

  /** Metadata <td> (dates, file sizes) */
  cellMeta: 'px-4 py-3.5 text-xs text-slate-500',

  /** Actions <td> — right-aligned button column */
  cellActions: 'px-4 py-3.5 text-right whitespace-nowrap',

  /** Empty state row spanning all columns */
  emptyRow: 'px-4 py-16 text-center',
} as const
