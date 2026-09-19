/**
 * Form System — Input, label, select, textarea, and error state tokens.
 * Use these instead of ad-hoc Tailwind on raw HTML form elements.
 * Compatible with shadcn/ui Input, Textarea, Select OR raw HTML.
 */
import { cn } from '@/lib/utils/cn'
import { focusStyles } from './motion-system'

export const inputStyles = {
  /** Standard text input */
  base: cn(
    'w-full rounded-md border border-slate-300 bg-white',
    'px-3 py-2 text-sm text-slate-900',
    'placeholder:text-slate-400',
    focusStyles.input,
    'transition-colors duration-200',
  ),

  /** Search input — extra left padding for leading icon (pl-9) */
  search: cn(
    'w-full rounded-md border border-slate-300 bg-white',
    'pl-9 pr-3 py-2 text-sm text-slate-900',
    'placeholder:text-slate-400',
    focusStyles.input,
    'transition-colors duration-200',
  ),

  /** Textarea — same as base, resize-none */
  textarea: cn(
    'w-full rounded-md border border-slate-300 bg-white',
    'px-3 py-2 text-sm text-slate-900',
    'placeholder:text-slate-400 resize-none',
    focusStyles.input,
    'transition-colors duration-200',
  ),

  /** Select — same border system */
  select: cn(
    'w-full rounded-md border border-slate-300 bg-white',
    'px-3 py-2 text-sm text-slate-900',
    focusStyles.input,
    'transition-colors duration-200',
  ),

  /** Error state overlay — add alongside base/textarea/select */
  errorOverlay: 'border-rose-300 focus-visible:ring-rose-300 focus-visible:border-rose-300',

  /** Disabled state overlay */
  disabledOverlay: 'opacity-50 cursor-not-allowed bg-slate-50',
} as const

export const labelStyles = {
  /** Standard field label above input */
  base: 'text-sm font-medium text-slate-700 leading-tight',

  /** Optional hint text below input */
  hint: 'text-[13px] text-slate-500 leading-tight mt-1',

  /** Inline error message below input */
  errorMsg: 'text-[13px] text-rose-600 leading-tight mt-1',

  /** Field group wrapper — label + input + hint vertically stacked */
  fieldGroup: 'flex flex-col gap-1.5',
} as const
