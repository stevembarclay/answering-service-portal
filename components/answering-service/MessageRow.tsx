'use client'

import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { BusinessMessageStatus, CallLog, MessagePriority } from '@/types/answeringService'

const PRIORITY_DOT_COLORS: Record<MessagePriority, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#94a3b8',
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h`
  return format(new Date(ts), 'MMM d')
}

function statusBarClass(m: CallLog): string {
  if (m.portalStatus === 'flagged_qa') return 'bg-amber-400'
  if (m.workflowStatus && !m.workflowStatus.isOpen) return 'bg-transparent'
  if (m.assignedTo) return 'bg-primary'
  if (m.portalStatus === 'new') return 'bg-blue-500'
  return 'bg-transparent'
}

interface MessageRowProps {
  message: CallLog
  statuses: BusinessMessageStatus[]
  isSelected?: boolean
  onSelect: (id: string) => void
  onHandled?: (id: string) => void
}

export function MessageRow({
  message,
  statuses,
  isSelected = false,
  onSelect,
  onHandled,
}: MessageRowProps) {
  const closedStatus = statuses.find((s) => !s.isOpen)
  const isHandled = !!(message.workflowStatus && !message.workflowStatus.isOpen)

  const initials = message.assignedToEmail
    ? message.assignedToEmail.slice(0, 2).toUpperCase()
    : null

  const callTypeLabel = message.callType.replace(/-/g, ' ')

  async function handleInline(e: React.MouseEvent) {
    e.stopPropagation()
    if (!closedStatus) return
    try {
      const res = await fetch(`/api/answering-service/messages/${message.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowStatusId: closedStatus.id }),
      })
      if (!res.ok) throw new Error('Failed.')
      onHandled?.(message.id)
    } catch {
      toast.error('Failed to mark as handled.')
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(message.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(message.id)
      }}
      className={cn(
        'group flex items-center gap-3 px-4 h-16 border-b border-border cursor-pointer transition-colors',
        'hover:bg-muted/50',
        isHandled && 'opacity-60',
        isSelected && 'bg-muted border-l-2 border-l-primary'
      )}
    >
      {/* Left status bar — 2px, full row height */}
      <div
        className={cn('w-0.5 self-stretch shrink-0 rounded-full', statusBarClass(message))}
      />

      {/* Priority dot */}
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: PRIORITY_DOT_COLORS[message.priority] }}
        aria-hidden="true"
      />

      {/* Main content: two lines */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground truncate">
            {message.callerName ?? message.callerNumber ?? 'Unknown'}
          </span>
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground capitalize">
            {callTypeLabel}
          </span>
        </div>
        <p className="truncate text-[12px] text-muted-foreground">{message.message}</p>
      </div>

      {/* Assignment initials */}
      {initials ? (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {initials}
        </span>
      ) : null}

      {/* Quick handle button — appears on hover */}
      {!isHandled && closedStatus ? (
        <button
          type="button"
          onClick={(e) => void handleInline(e)}
          className="shrink-0 hidden group-hover:flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Mark as handled"
        >
          ✓
        </button>
      ) : null}

      {/* Timestamp */}
      <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
        {relativeTime(message.timestamp)}
      </span>
    </div>
  )
}
