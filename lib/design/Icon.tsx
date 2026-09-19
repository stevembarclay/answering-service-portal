'use client'

/**
 * Icon - Design System Wrapper Component
 *
 * USAGE:
 * - size: xs (14px), sm (16px), md (20px), lg (24px), xl (32px)
 * - status: success, warning, error, info (applies semantic color)
 * - weight: recessive (muted), neutral, prominent, brand (when status not used)
 * - SuccessIcon, ErrorIcon, WarningIcon, InfoIcon: convenience wrappers
 *
 * EXAMPLES:
 * <Icon icon={AlertCircle} size="md" status="error" />
 * <SuccessIcon icon={Check} size="sm" />
 * <Icon icon={FileText} size="sm" weight="recessive" />
 *
 * DO NOT:
 * - Use w-4 h-4 or similar (use size prop)
 * - Use inline text-rose-600 etc. (use status or weight)
 * - Import Lucide icons without wrapping in Icon
 */

import type { IconComponent } from '@/lib/design/icons'
import { cn } from '@/lib/utils/cn'
import { iconSizes, iconWeights } from './icon-system'

export type IconSize = keyof typeof iconSizes
export type IconWeight = 'recessive' | 'neutral' | 'prominent' | 'brand'
export type StatusWeight = 'success' | 'warning' | 'error' | 'info'

export interface IconProps {
  icon: IconComponent
  size?: IconSize
  weight?: IconWeight
  status?: StatusWeight
  className?: string
}

export function Icon({
  icon: IconComponent,
  size = 'md',
  weight,
  status,
  className,
}: IconProps) {
  const sizeValue = iconSizes[size]

  let weightClass = ''
  if (status) {
    weightClass = iconWeights.status[status]
  } else if (weight) {
    weightClass = iconWeights[weight]
  }

  return (
    <IconComponent size={sizeValue} className={cn(weightClass, className)} />
  )
}

export function SuccessIcon({
  icon,
  size = 'md',
  ...props
}: Omit<IconProps, 'status'>) {
  return <Icon icon={icon} size={size} status="success" {...props} />
}

export function ErrorIcon({
  icon,
  size = 'md',
  ...props
}: Omit<IconProps, 'status'>) {
  return <Icon icon={icon} size={size} status="error" {...props} />
}

export function WarningIcon({
  icon,
  size = 'md',
  ...props
}: Omit<IconProps, 'status'>) {
  return <Icon icon={icon} size={size} status="warning" {...props} />
}

export function InfoIcon({
  icon,
  size = 'md',
  ...props
}: Omit<IconProps, 'status'>) {
  return <Icon icon={icon} size={size} status="info" {...props} />
}
