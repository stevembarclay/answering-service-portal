'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import type { CallerHistory } from '@/lib/services/answering-service/callerHistoryService'

function relativeDate(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(diff / 86400000)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return format(new Date(ts), 'MMM d')
}

function portalStatusLabel(status: string): string {
  if (status === 'new') return 'Unread'
  if (status === 'read') return 'Read'
  if (status === 'flagged_qa') return 'Flagged'
  if (status === 'resolved') return 'Resolved'
  return status
}

function portalStatusClass(status: string): string {
  if (status === 'new') return 'text-blue-600'
  if (status === 'flagged_qa') return 'text-amber-600'
  if (status === 'resolved') return 'text-emerald-600'
  return 'text-muted-foreground'
}

interface CallerHistorySectionProps {
  callerNumber: string
  currentMessageId: string
}

export function CallerHistorySection({
  callerNumber,
  currentMessageId,
}: CallerHistorySectionProps) {
  const [history, setHistory] = useState<CallerHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)

    async function load() {
      try {
        const encoded = btoa(callerNumber)
        const res = await fetch(`/api/answering-service/callers/${encoded}/history`, {
          cache: 'no-store',
        })
        if (cancelled) return
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (!res.ok) return
        const payload = (await res.json()) as { data: CallerHistory }
        if (!cancelled) setHistory(payload.data)
      } catch {
        // non-fatal — section just doesn't render
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [callerNumber])

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Caller History</span>
        </div>
        <div className="p-5 space-y-2">
          <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-3 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !history) return null

  const otherCalls = history.recentCalls.filter((c) => c.id !== currentMessageId)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex h-[52px] items-center border-b border-border px-5">
        <span className="text-sm font-semibold text-foreground">Caller History</span>
      </div>
      <div className="p-5 space-y-3">
        {/* Summary row */}
        <div>
          <p className="text-[13px] text-foreground">
            <span className="font-semibold">{history.callerNumber}</span>
            {' · '}
            <span className="font-semibold">{history.totalCalls}</span>
            {history.totalCalls === 1 ? ' total call' : ' total calls'}
            {history.callsLast30Days > 0 ? (
              <>
                {' · '}
                <span className="font-semibold">{history.callsLast30Days}</span>
                {' this month'}
              </>
            ) : null}
          </p>
          <p className="text-[12px] text-muted-foreground">
            Last called: {relativeDate(history.lastCallAt)}
          </p>
        </div>

        {/* Recent calls */}
        {otherCalls.length > 0 ? (
          <ol className="space-y-1.5">
            {otherCalls.map((call) => (
              <li
                key={call.id}
                className="flex items-start gap-2 text-[12px]"
              >
                <span className="mt-0.5 shrink-0 text-muted-foreground">›</span>
                <div className="min-w-0">
                  <span className="text-muted-foreground">
                    {format(new Date(call.timestamp), 'MMM d')}
                  </span>
                  {' · '}
                  <span className="capitalize text-foreground">
                    {call.callType.replace(/-/g, ' ')}
                  </span>
                  {' · '}
                  <span className={cn('font-medium', portalStatusClass(call.portalStatus))}>
                    {portalStatusLabel(call.portalStatus)}
                  </span>
                  {call.messageSnippet ? (
                    <p className="truncate text-muted-foreground">{call.messageSnippet}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        ) : null}

        {/* View all link */}
        {history.totalCalls > 1 ? (
          <a
            href={`/answering-service/messages?callerNumber=${encodeURIComponent(btoa(callerNumber))}`}
            className="block text-[12px] text-primary hover:underline"
          >
            View all calls from this number →
          </a>
        ) : null}
      </div>
    </div>
  )
}
