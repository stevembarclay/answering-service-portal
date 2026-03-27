import Link from 'next/link'
import { cardBorderHover, cardVariants } from '@/lib/design/card-system'
import { hoverTransitions } from '@/lib/design/motion-system'
import { bodyStyles, headingStyles } from '@/lib/design/typography-system'
import { cn } from '@/lib/utils/cn'

interface DashboardBillingCardProps {
  currentMonthEstimateCents: number
  callCount: number
  daysRemaining: number
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function DashboardBillingCard({
  currentMonthEstimateCents,
  callCount,
  daysRemaining,
}: DashboardBillingCardProps) {
  return (
    <Link
      href="/answering-service/billing"
      className={cn(cardVariants.interactive, cardBorderHover.success, hoverTransitions.card, 'block p-5')}
    >
      <div className="space-y-2">
        <p className={`${bodyStyles.caption} text-slate-500`}>This month</p>
        <h2 className="text-4xl font-bold tabular-nums leading-none tracking-tight text-foreground">
          {formatMoney(currentMonthEstimateCents)}
        </h2>
        <p className={`${bodyStyles.small} text-slate-600`}>
          {callCount} call{callCount === 1 ? '' : 's'} · {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining
        </p>
        <p className={headingStyles.h4.base}>View billing →</p>
      </div>
    </Link>
  )
}
