'use client'

import { ArrowRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cardVariants } from '@/lib/design/card-system'
import { bodyStyles } from '@/lib/design/typography-system'
import { cn } from '@/lib/utils/cn'
import type { SVGProps } from 'react'

type IconComponent = React.ComponentType<SVGProps<SVGSVGElement>>

interface DashboardSummaryCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: IconComponent
  isLoading?: boolean
  clickable?: boolean
}

export function DashboardSummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  isLoading = false,
  clickable = false,
}: DashboardSummaryCardProps) {
  if (isLoading) {
    return (
      <div className={cn(cardVariants.dataPanel, 'p-5')}>
        <Skeleton className="h-3 w-20 mb-4" />
        <Skeleton className="h-11 w-28 mb-3" />
        {subtitle !== undefined && <Skeleton className="h-3 w-36" />}
      </div>
    )
  }

  return (
    <div
      className={cn(
        cardVariants.dataPanel,
        'group p-5',
        clickable && 'cursor-pointer'
      )}
    >
      {/* Label — uppercase micro above the number */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          <p className={cn(bodyStyles.micro, 'text-muted-foreground tracking-widest')}>
            {title}
          </p>
        </div>
        {clickable && (
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
        )}
      </div>

      {/* Dominant number — the hero */}
      <p className="text-4xl font-bold tabular-nums leading-none tracking-tight text-foreground">
        {value}
      </p>

      {/* Context line below */}
      {subtitle && (
        <p className={cn(bodyStyles.caption, 'mt-2 text-muted-foreground')}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
