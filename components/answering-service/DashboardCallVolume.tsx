import { Sparkline } from '@/components/answering-service/Sparkline'
import { bodyStyles, headingStyles } from '@/lib/design/typography-system'
import { cardBorderHover, cardVariants } from '@/lib/design/card-system'
import { hoverTransitions } from '@/lib/design/motion-system'
import { cn } from '@/lib/utils/cn'
import type { DayCount } from '@/types/answeringService'

interface DashboardCallVolumeProps {
  callsThisWeek: number
  callsLastWeek: number
  callsByDay: DayCount[]
}

export function DashboardCallVolume({
  callsThisWeek,
  callsLastWeek,
  callsByDay,
}: DashboardCallVolumeProps) {
  const delta = callsThisWeek - callsLastWeek
  const deltaLabel = delta === 0 ? 'No change' : `${delta > 0 ? '+' : ''}${delta} vs last week`

  return (
    <section className={cn(cardVariants.interactive, cardBorderHover.neutral, hoverTransitions.card, 'p-5')}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className={`${bodyStyles.caption} text-slate-500`}>Call volume</p>
          <h2 className="text-4xl font-bold tabular-nums leading-none tracking-tight text-foreground">
            {callsThisWeek}
          </h2>
          <p className={`${bodyStyles.small} text-slate-600`}>
            {callsLastWeek} last week · {deltaLabel}
          </p>
          <p className={headingStyles.h4.base}>This week</p>
        </div>
        <div className="pt-2">
          <Sparkline data={callsByDay} width={96} height={32} color="var(--portal-brand-color, #334155)" />
        </div>
      </div>
    </section>
  )
}
