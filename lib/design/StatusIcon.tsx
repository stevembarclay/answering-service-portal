'use client'

/**
 * StatusIcon - Circular status indicators with background
 *
 * USAGE:
 * - StatusIcon: circular bg + icon. Types: linked, stale, unlinked, flagged, empty.
 * - InlineStatus: icon + label + optional count for list cards, dashboards.
 * - pulse: for urgent/attention states
 * - Use aria-label when icon alone (accessibility)
 *
 * EXAMPLES:
 * <StatusIcon type="linked" icon={Check} size="md" />
 * <InlineStatus type="linked" icon={Check} label="Active" count={4} />
 * <StatusIcon type="flagged" icon={AlertCircle} pulse aria-label="Flagged" />
 *
 * DO NOT:
 * - Use for generic icons (use Icon component)
 * - Omit icon (required)
 * - Use custom colors (type drives color from statusIcons)
 */

import type { IconComponent } from '@/lib/design/icons'
import { cn } from '@/lib/utils/cn'
import { statusIcons } from './icon-system'
import { Text, Data } from './Typography'

export type StatusType = 'linked' | 'stale' | 'unlinked' | 'flagged' | 'empty'

export interface StatusIconProps {
  type: StatusType
  icon: IconComponent
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
  'aria-label'?: string
}

export function StatusIcon({
  type,
  icon: IconComponent,
  size = 'md',
  pulse,
  className,
  'aria-label': ariaLabel,
}: StatusIconProps) {
  const config = statusIcons[type]
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  }
  const iconPx = size === 'sm' ? 14 : size === 'md' ? 16 : 20

  return (
    <div
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      className={cn(
        config.bgClassName,
        sizeClasses[size],
        'rounded-full inline-flex items-center justify-center shrink-0',
        pulse && 'animate-pulse',
        className
      )}
    >
      <IconComponent className={config.className} size={iconPx} />
    </div>
  )
}

export interface InlineStatusProps {
  type: StatusType
  icon: IconComponent
  label: string
  count?: number
  className?: string
}

export function InlineStatus({
  type,
  icon,
  label,
  count,
  className,
}: InlineStatusProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <StatusIcon type={type} icon={icon} size="sm" />
      <Text size="small" className="text-slate-700">
        {label}
      </Text>
      {count !== undefined && (
        <Data size="micro" className="text-slate-500">
          ({count})
        </Data>
      )}
    </div>
  )
}
