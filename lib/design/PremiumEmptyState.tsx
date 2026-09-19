'use client'

import { cn } from '@/lib/utils/cn'
import type { IconComponent } from '@/lib/design/icons'
import { iconSizes } from '@/lib/design/icon-system'
import { headingStyles, bodyStyles } from '@/lib/design/typography-system'

interface PremiumEmptyStateProps {
  icon?: IconComponent
  /** Display headline */
  headline: string
  /** Body text */
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  /** CTA button(s) */
  children?: React.ReactNode
  /** Trust indicators (e.g., "SOC 2 Compliant", "WORM Storage") */
  trustIndicators?: Array<{ icon: React.ReactNode; label: string }>
  className?: string
}

export function PremiumEmptyState({
  icon: Icon,
  headline,
  description,
  action,
  children,
  trustIndicators,
  className,
}: PremiumEmptyStateProps) {
  return (
    <div className={cn('w-full text-center py-16 px-6', className)}>
      {Icon ? (
        <div className="mb-4 flex justify-center">
          <Icon size={iconSizes.xl} className="text-slate-300" aria-hidden />
        </div>
      ) : null}

      {/* Headline */}
      <h3 className={cn(headingStyles.h3.base, 'text-slate-800 mb-2')}>
        {headline}
      </h3>

      {/* Description */}
      <p className={cn(bodyStyles.base, 'text-slate-500 leading-relaxed mb-6 w-full max-w-md mx-auto')}>
        {description}
      </p>

      {/* CTA area */}
      {(action || children) && (
        <div className="flex items-center justify-center gap-3 mb-8">
          {action?.href ? (
            <a
              href={action.href}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {action.label}
            </a>
          ) : null}
          {action?.onClick ? (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {action.label}
            </button>
          ) : null}
          {children}
        </div>
      )}

      {/* Trust indicators */}
      {trustIndicators && trustIndicators.length > 0 && (
        <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
          {trustIndicators.map((indicator, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {indicator.icon}
              <span>{indicator.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
