'use client'

import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { cardBorderHover, cardVariants } from '@/lib/design/card-system'
import { badgeVariants, statusColors } from '@/lib/design/color-system'
import { hoverTransitions } from '@/lib/design/motion-system'
import { cardSpacing } from '@/lib/design/spacing-system'
import { bodyStyles, dataStyles, headingStyles } from '@/lib/design/typography-system'
import { cn } from '@/lib/utils/cn'
import type { BillingEstimate } from '@/types/answeringService'

interface RunningEstimateCardProps {
  estimate: BillingEstimate
  priorMonthTotalCents?: number
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function RunningEstimateCard({
  estimate,
  priorMonthTotalCents,
}: RunningEstimateCardProps) {
  // Extract year/month from UTC ISO string directly — avoids timezone rollback
  // (new Date('2026-03-01T00:00:00Z') in UTC-5 = Feb 28, so we parse the string instead)
  const [yearStr, monthStr] = estimate.periodStart.slice(0, 7).split('-')
  const periodLocalDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1)
  const periodLabel = `${format(periodLocalDate, 'MMMM yyyy')} · Running estimate`
  const progress =
    priorMonthTotalCents && priorMonthTotalCents > 0
      ? Math.min(100, Math.round((estimate.totalCents / priorMonthTotalCents) * 100))
      : null

  return (
    <section className={cn(cardVariants.interactive, cardBorderHover.success, hoverTransitions.card, cardSpacing.standalone)}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className={`${bodyStyles.caption} text-slate-500`}>{periodLabel}</p>
            <h2 className={cn(dataStyles.prominent, 'text-slate-950 tabular-nums')}>{formatMoney(estimate.totalCents)}</h2>
          </div>
          <Badge className={badgeVariants.success}>
            <span className={cn('mr-1 inline-flex h-2 w-2 rounded-full animate-pulse', statusColors.success.dot)} />
            LIVE
          </Badge>
        </div>

        {progress !== null ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className={`${bodyStyles.caption} text-slate-500`}>Vs prior month</p>
              <p className={`${bodyStyles.caption} text-slate-700`}>{progress}%</p>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <h3 className={`${headingStyles.h4.base} text-slate-900`}>Line items</h3>
          <div className="space-y-3">
            {estimate.lineItems.map((item) => (
              <div key={item.ruleId} className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className={`${bodyStyles.small} font-medium text-slate-900`}>{item.ruleName}</p>
                  <p className={`${bodyStyles.caption} text-slate-500`}>{item.unitDescription}</p>
                </div>
                <p className={`${bodyStyles.small} font-semibold text-slate-900 tabular-nums`}>
                  {formatMoney(item.subtotalCents)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
