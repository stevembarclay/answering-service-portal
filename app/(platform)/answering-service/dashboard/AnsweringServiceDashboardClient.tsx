'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Phone, Receipt, TrendingDown, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import type { DashboardSummary } from '@/types/answeringService'

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { data?: T; error?: { message?: string } }

  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message ?? 'Request failed.')
  }

  return payload.data
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return `Today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-14 w-full mb-2" />
        <Skeleton className="h-14 w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-3 w-28 mb-3" />
          <Skeleton className="h-10 w-24 mb-3" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-3 w-28 mb-3" />
          <Skeleton className="h-10 w-16 mb-3" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
    </div>
  )
}

export default function AnsweringServiceDashboardClient({ businessId }: { businessId: string }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)

  async function loadSummary() {
    setIsLoading(true)
    setError(null)

    try {
      setSummary(
        await parseJson<DashboardSummary>(
          await fetch('/api/answering-service/dashboard', { cache: 'no-store' })
        )
      )
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load dashboard.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [])

  // Supabase Realtime — requires postgres_changes enabled on call_logs
  // in Supabase dashboard (Realtime → Tables → call_logs)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`dashboard_calls_${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_logs',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const newCall = payload.new as {
            priority: string
            portal_status: string
          }
          if (newCall.portal_status === 'new') {
            setSummary((prev) =>
              prev ? { ...prev, unreadCount: prev.unreadCount + 1 } : prev
            )
          }
          if (newCall.priority === 'high') {
            toast('New urgent call received', {
              description: 'Check your messages for details.',
            })
          }
          setIsLive(true)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsLive(true)
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') setIsLive(false)
      })

    return () => { void supabase.removeChannel(channel) }
  }, [businessId])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Priority messages, this month&apos;s billing, and call volume at a glance.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="mb-3 text-sm font-medium text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => void loadSummary()}
            className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
          >
            Try again
          </button>
        </div>
      ) : null}

      {isLoading || !summary ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Priority Messages card */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex h-[52px] items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Recent Unread Messages</span>
                {isLive ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    Live
                  </span>
                ) : null}
              </div>
              {summary.unreadCount > 0 ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                  {summary.unreadCount} unread
                </span>
              ) : null}
            </div>

            {summary.topUnreadMessages.map((msg) => (
              <Link
                key={msg.id}
                href={`/answering-service/messages?id=${msg.id}`}
                className="flex h-14 items-center gap-3 border-b border-border px-5 hover:bg-muted/50 transition-colors"
              >
                <div className="h-2 w-2 shrink-0 rounded-full bg-info" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {msg.callerNumber ?? 'Unknown'} — {msg.message}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatTimestamp(msg.timestamp)}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}

            <Link
              href="/answering-service/messages"
              className="flex h-11 items-center px-5 text-[13px] text-primary hover:underline"
            >
              View all {summary.unreadCount} unread messages →
            </Link>
          </div>

          {/* Charts row */}
          {summary.callsByHour.some((h) => h.count > 0) ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex h-[52px] items-center border-b border-border px-5">
                <span className="text-sm font-semibold text-foreground">Busiest Hours</span>
                <span className="ml-2 text-xs text-muted-foreground">(last 30 days)</span>
              </div>
              <div className="px-4 py-4">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={summary.callsByHour} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(h: number) => h % 6 === 0 ? `${h}:00` : ''}
                      tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v: unknown) => [`${v as number} calls`, '']}
                      contentStyle={{
                        background: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {summary.callsByHour.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.count === Math.max(...summary.callsByHour.map((h) => h.count))
                              ? 'var(--color-primary)'
                              : 'var(--color-muted)'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          {summary.callTypeBreakdown.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex h-[52px] items-center border-b border-border px-5">
                <span className="text-sm font-semibold text-foreground">Call Types</span>
                <span className="ml-2 text-xs text-muted-foreground">(last 30 days)</span>
              </div>
              {(() => {
                const top5 = summary.callTypeBreakdown.slice(0, 5)
                const total = top5.reduce((s, t) => s + t.count, 0)
                return top5.map((type) => (
                  <div
                    key={type.callType}
                    className="flex items-center gap-3 px-5 py-2.5 border-b border-border last:border-0"
                  >
                    <span className="w-28 shrink-0 text-[13px] text-foreground capitalize">
                      {type.callType.replace(/-/g, ' ')}
                    </span>
                    <div className="flex-1 rounded-full bg-muted h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${Math.round((type.count / total) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-[13px] text-muted-foreground">
                      {type.count}
                    </span>
                  </div>
                ))
              })()}
            </div>
          ) : null}

          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Billing card */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-muted-foreground">
                  This Month (est.)
                </span>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-[32px] font-bold leading-none text-foreground">
                {formatCents(summary.currentMonthEstimate)}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-muted-foreground">
                  {summary.currentMonthCallCount} calls
                </span>
                <div className="h-1 w-1 rounded-full bg-border" />
                <span className="text-[13px] text-muted-foreground">
                  {summary.daysRemainingInPeriod} days remaining
                </span>
              </div>
            </div>

            {/* Calls card */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-muted-foreground">
                  Calls This Week
                </span>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-[32px] font-bold leading-none text-foreground">
                {summary.callsThisWeek}
              </span>
              {(() => {
                const diff = summary.callsThisWeek - summary.callsLastWeek
                const isUp = diff >= 0
                const TrendIcon = isUp ? TrendingUp : TrendingDown
                return (
                  <div className="flex items-center gap-1.5">
                    <TrendIcon
                      className={`h-3.5 w-3.5 ${isUp ? 'text-success' : 'text-destructive'}`}
                    />
                    <span
                      className={`text-[13px] ${isUp ? 'text-success' : 'text-destructive'}`}
                    >
                      {isUp ? '+' : ''}
                      {diff} from last week
                    </span>
                  </div>
                )
              })()}

              {/* Bar chart */}
              {summary.callsByDay.length > 0 ? (
                <div className="flex h-10 items-end gap-1">
                  {summary.callsByDay.map((day, i) => {
                    const max = Math.max(...summary.callsByDay.map((d) => d.count), 1)
                    const pct = day.count / max
                    const heightPx = Math.max(4, Math.round(pct * 40))
                    const isLast = i === summary.callsByDay.length - 1
                    return (
                      <div
                        key={day.date}
                        style={{ height: `${heightPx}px` }}
                        className={`flex-1 rounded-sm ${isLast ? 'bg-primary' : 'bg-muted'}`}
                      />
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
