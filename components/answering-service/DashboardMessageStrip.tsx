import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { cardBorderHover, cardVariants } from '@/lib/design/card-system'
import { hoverTransitions } from '@/lib/design/motion-system'
import { bodyStyles, headingStyles } from '@/lib/design/typography-system'
import { cn } from '@/lib/utils/cn'
import type { CallLog, MessagePriority } from '@/types/answeringService'

const PRIORITY_DOT_COLORS: Record<MessagePriority, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#94a3b8',
}

interface DashboardMessageStripProps {
  messages: CallLog[]
  totalUnreadCount: number
}

export function DashboardMessageStrip({ messages, totalUnreadCount }: DashboardMessageStripProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className={`${headingStyles.h3.base} text-slate-900`}>Priority inbox</h2>
        <p className={`${bodyStyles.small} text-slate-600`}>
          Highest priority unread messages that need attention first.
        </p>
      </div>

      {messages.length === 0 ? (
        <div className={`${cardVariants.static} p-6`}>
          <p className={`${bodyStyles.small} text-slate-500`}>No high or medium unread messages right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <Link
              key={message.id}
              href="/answering-service/messages"
              className={cn(cardVariants.interactive, cardBorderHover.neutral, hoverTransitions.card, 'block p-4')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PRIORITY_DOT_COLORS[message.priority] }}
                      aria-hidden="true"
                    />
                    <span className={`${bodyStyles.caption} capitalize text-slate-500`}>
                      {message.callType.replace(/-/g, ' ')}
                    </span>
                  </div>
                  <h3 className={`${bodyStyles.small} truncate font-semibold text-slate-900`}>
                    {message.callerName ?? 'Unknown caller'}
                  </h3>
                </div>
                <p className={`${bodyStyles.caption} whitespace-nowrap text-slate-500`}>
                  {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link href="/answering-service/messages" className={`${bodyStyles.caption} inline-flex text-slate-700 underline underline-offset-4`}>
        View all {totalUnreadCount} message{totalUnreadCount === 1 ? '' : 's'} →
      </Link>
    </section>
  )
}
