'use client'

import { cn } from '@/lib/utils/cn'
import { IconAlert, IconCheckmark, IconClock, IconLinkAlt, IconUnlink, IconFlag, type IconComponent } from '@/lib/design/icons'

export type StatusType = 'linked' | 'unlinked' | 'stale' | 'flagged' | 'approved' | 'pending' | 'error'
export type StatusTier = 1 | 2 | 3

interface StatusIndicatorProps {
  status: StatusType
  tier: StatusTier
  /** Additional context for Tier 1 (e.g., "Requires evidence") */
  description?: string
  /** Days/count for context (e.g., "45 days") */
  detail?: string
  className?: string
}

const statusConfig: Record<StatusType, {
  label: string
  icon: IconComponent
  tier1: string
  tier2: string
  dot: string
}> = {
  linked: {
    label: 'Linked',
    icon: IconLinkAlt,
    tier1: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    tier2: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  approved: {
    label: 'Approved',
    icon: IconCheckmark,
    tier1: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    tier2: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  stale: {
    label: 'Stale',
    icon: IconClock,
    tier1: 'bg-amber-50 border-amber-200 text-amber-900',
    tier2: 'bg-amber-50 border-amber-200 text-amber-700',
    dot: 'bg-amber-500',
  },
  pending: {
    label: 'Pending',
    icon: IconClock,
    tier1: 'bg-blue-50 border-blue-200 text-blue-900',
    tier2: 'bg-blue-50 border-blue-200 text-blue-700',
    dot: 'bg-blue-500',
  },
  unlinked: {
    label: 'Unlinked',
    icon: IconUnlink,
    tier1: 'bg-rose-50 border-rose-200 text-rose-900',
    tier2: 'bg-rose-50 border-rose-200 text-rose-700',
    dot: 'bg-rose-500',
  },
  flagged: {
    label: 'Flagged',
    icon: IconFlag,
    tier1: 'bg-rose-50 border-rose-200 text-rose-900',
    tier2: 'bg-rose-50 border-rose-200 text-rose-700',
    dot: 'bg-rose-500',
  },
  error: {
    label: 'Error',
    icon: IconAlert,
    tier1: 'bg-rose-50 border-rose-200 text-rose-900',
    tier2: 'bg-rose-50 border-rose-200 text-rose-700',
    dot: 'bg-rose-500',
  },
}

export function StatusIndicator({
  status,
  tier,
  description,
  detail,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status]
  const IconComponent = config.icon

  // Tier 1: Critical — large, prominent, demands attention
  if (tier === 1) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 px-4 py-3 border rounded-md',
          config.tier1,
          className
        )}
        role="status"
        aria-label={`${config.label}${description ? `: ${description}` : ''}`}
      >
        <IconComponent className="w-5 h-5 mt-0.5 shrink-0" aria-hidden />
        <div>
          <div className="text-sm font-semibold">{config.label}</div>
          {description && (
            <div className="text-sm opacity-80 mt-0.5">{description}</div>
          )}
          {detail && (
            <div className="font-mono text-xs tabular-nums opacity-60 mt-1">{detail}</div>
          )}
        </div>
      </div>
    )
  }

  // Tier 2: Standard — inline, contextual
  if (tier === 2) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 border rounded text-xs font-medium',
          config.tier2,
          className
        )}
        role="status"
        aria-label={`${config.label}${detail ? ` ${detail}` : ''}`}
      >
        <IconComponent className="w-3.5 h-3.5" aria-hidden />
        <span>{config.label}</span>
        {detail && (
          <span className="opacity-60">· {detail}</span>
        )}
      </div>
    )
  }

  // Tier 3: Compact — minimal, scannable
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-slate-600',
        className
      )}
      role="status"
      aria-label={config.label}
    >
      <div className={cn('w-2 h-2 rounded-full', config.dot)} aria-hidden />
      <span>{config.label}</span>
    </div>
  )
}
