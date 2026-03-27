import { cn } from '@/lib/utils/cn'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

/**
 * PageHeader — standard page top bar.
 *
 * Use at the top of every page inside the portal or operator layouts.
 * Replaces the ad-hoc `flex h-16 items-center` pattern.
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-4',
        'border-b border-border bg-card px-5 py-4 md:px-8 md:py-5',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      )}
    </div>
  )
}
