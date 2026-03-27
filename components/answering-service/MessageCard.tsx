'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cardBorderHover, cardVariants } from '@/lib/design/card-system'
import { hoverTransitions } from '@/lib/design/motion-system'
import { bodyStyles } from '@/lib/design/typography-system'
import { cn } from '@/lib/utils/cn'
import type { BusinessMessageStatus, CallLog, MessagePriority } from '@/types/answeringService'

const PRIORITY_DOT_COLORS: Record<MessagePriority, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#94a3b8',
}

const PRIORITY_LABELS: Record<MessagePriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

interface MessageCardProps {
  message: CallLog
  statuses: BusinessMessageStatus[]
  onFlagQA: (id: string) => void
  onView: (id: string) => void
  isFlaggingQA?: boolean
  onStatusChanged?: (messageId: string, status: BusinessMessageStatus | null) => void
}

function StatusBadge({
  messageId,
  current,
  statuses,
  onChanged,
}: {
  messageId: string
  current: BusinessMessageStatus | null | undefined
  statuses: BusinessMessageStatus[]
  onChanged: (status: BusinessMessageStatus | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function select(status: BusinessMessageStatus | null, e: React.MouseEvent) {
    e.stopPropagation()
    setOpen(false)
    if (status?.id === current?.id) return
    const previous = current ?? null
    setLoading(true)
    onChanged(status)
    try {
      const res = await fetch(`/api/answering-service/messages/${messageId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowStatusId: status?.id ?? null }),
      })
      if (!res.ok) throw new Error('Failed.')
    } catch {
      onChanged(previous)
      toast.error('Failed to update status.')
    } finally {
      setLoading(false)
    }
  }

  if (statuses.length === 0) return null

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={loading}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex min-h-[32px] items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: current?.color ?? '#94a3b8' }}
          aria-hidden="true"
        />
        <span className={current ? 'text-foreground' : 'text-muted-foreground'}>
          {current?.label ?? 'No status'}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-border bg-card shadow-lg overflow-hidden"
        >
          <button
            type="button"
            role="option"
            aria-selected={!current}
            onClick={(e) => void select(null, e)}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
            No status
          </button>
          {statuses.map((s) => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={current?.id === s.id}
              onClick={(e) => void select(s, e)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted transition-colors',
                current?.id === s.id ? 'bg-muted' : ''
              )}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function MessageCard({
  message,
  statuses,
  onFlagQA,
  onView,
  isFlaggingQA = false,
  onStatusChanged,
}: MessageCardProps) {
  const isFlagged = message.portalStatus === 'flagged_qa'
  const [currentStatus, setCurrentStatus] = useState<BusinessMessageStatus | null>(
    message.workflowStatus ?? null
  )

  return (
    <article
      className={cn(cardVariants.interactive, cardBorderHover.neutral, hoverTransitions.card, 'p-4 cursor-pointer')}
      onClick={() => onView(message.id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: PRIORITY_DOT_COLORS[message.priority] }}
              role="img"
              aria-label={`${PRIORITY_LABELS[message.priority]} priority`}
            />
            <span className={`${bodyStyles.caption} font-semibold text-slate-900`}>
              {PRIORITY_LABELS[message.priority]}
            </span>
            <span className={`${bodyStyles.caption} text-slate-400`}>·</span>
            <span className={`${bodyStyles.caption} text-slate-600 capitalize`}>
              {message.callType.replace(/-/g, ' ')}
            </span>
          </div>
          <h3 className="truncate text-base font-semibold text-slate-900">
            {message.callerName ?? 'Unknown caller'}
          </h3>
        </div>
        <p className={`${bodyStyles.caption} whitespace-nowrap text-slate-500`}>
          {format(new Date(message.timestamp), 'MMM d · h:mma')}
        </p>
      </div>

      <p className={`${bodyStyles.small} mt-3 line-clamp-2 text-slate-600`}>{message.message}</p>

      {/* Status badge + actions */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <StatusBadge
          messageId={message.id}
          current={currentStatus}
          statuses={statuses}
          onChanged={(status) => {
            setCurrentStatus(status)
            onStatusChanged?.(message.id, status)
          }}
        />
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isFlagged || isFlaggingQA}
            className="text-slate-500 hover:text-slate-800 disabled:text-slate-400"
            onClick={() => onFlagQA(message.id)}
          >
            {isFlagged ? 'Flagged' : isFlaggingQA ? 'Flagging...' : 'Flag QA'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => onView(message.id)}>
            View →
          </Button>
        </div>
      </div>
    </article>
  )
}
