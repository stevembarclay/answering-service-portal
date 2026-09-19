'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CheckCheck, Loader2, CalendarClock } from 'lucide-react'
import type { MonthCloseResponse, MonthCloseRow } from '@/lib/services/operator/monthCloseService'
import { PageHeader } from '@/components/ui/page-header'
import { cardVariants } from '@/lib/design/card-system'
import { badgeVariants } from '@/lib/design/color-system'
import { dataStyles, bodyStyles } from '@/lib/design/typography-system'
import { PremiumEmptyState } from '@/lib/design'
import { cn } from '@/lib/utils/cn'
import { ClosePeriodDialog } from '@/components/operator/ClosePeriodDialog'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMonth(m: string): string {
  const [y, mon] = m.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(y, mon - 1, 1)
  )
}

function adjacentMonth(m: string, delta: number): string {
  const [y, mon] = m.split('-').map(Number)
  const d = new Date(y, mon - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function statusBadge(status: MonthCloseRow['status']): { label: string; cls: string } {
  if (status === 'closed') return { label: 'Closed', cls: badgeVariants.success }
  if (status === 'paid') return { label: 'Paid', cls: badgeVariants.info }
  return { label: 'Open', cls: badgeVariants.warning }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MonthCloseClientProps {
  initialData: MonthCloseResponse
  month: string
}

export function MonthCloseClient({ initialData, month }: MonthCloseClientProps) {
  const router = useRouter()
  const [rows, setRows] = useState<MonthCloseRow[]>(initialData.rows)
  const [dialogId, setDialogId] = useState<string | null>(null)
  const [batchPending, setBatchPending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Derived stats
  const openCount = rows.filter((r) => r.status === 'open').length
  const closedCount = rows.filter((r) => r.status !== 'open').length
  const totalRevenueCents = rows.reduce((s, r) => s + r.finalTotalCents, 0)
  const dialogRow = dialogId ? (rows.find((r) => r.periodId === dialogId) ?? null) : null

  function navMonth(delta: number) {
    router.push(`?month=${adjacentMonth(month, delta)}`)
  }

  async function handleClosePeriod(periodId: string, adjustmentCents: number, note: string) {
    const res = await fetch(`/api/operator/month-close/${periodId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustmentCents, adjustmentNote: note || undefined }),
    })
    if (!res.ok) {
      const body = (await res.json()) as { error?: { message?: string } }
      throw new Error(body.error?.message ?? 'Failed to close period.')
    }
    const closed = (await res.json()) as MonthCloseRow
    setRows((prev) => prev.map((r) => (r.periodId === periodId ? closed : r)))
    setFeedback({ type: 'success', message: `${closed.clientName} — period closed.` })
  }

  async function handleBatchClose() {
    const openIds = rows.filter((r) => r.status === 'open').map((r) => r.periodId)
    if (openIds.length === 0) return
    setBatchPending(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/operator/month-close/batch-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodIds: openIds }),
      })
      if (!res.ok) throw new Error('Batch close request failed.')
      const result = (await res.json()) as {
        succeeded: string[]
        failed: Array<{ id: string; error: string }>
      }
      // Re-fetch fresh server state
      const freshRes = await fetch(`/api/operator/month-close?month=${month}`)
      if (freshRes.ok) {
        const freshData = (await freshRes.json()) as MonthCloseResponse
        setRows(freshData.rows)
      }
      setFeedback(
        result.failed.length === 0
          ? {
              type: 'success',
              message: `${result.succeeded.length} period${result.succeeded.length !== 1 ? 's' : ''} closed.`,
            }
          : {
              type: 'error',
              message: `${result.succeeded.length} closed, ${result.failed.length} failed.`,
            }
      )
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Batch close failed.',
      })
    } finally {
      setBatchPending(false)
    }
  }

  const actions = (
    <>
      {/* Month navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => navMonth(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="w-36 text-center text-[13px] font-semibold text-foreground tabular-nums">
          {formatMonth(month)}
        </span>
        <button
          onClick={() => navMonth(1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Batch close */}
      <button
        onClick={handleBatchClose}
        disabled={openCount === 0 || batchPending}
        className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {batchPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCheck className="h-3.5 w-3.5" />
        )}
        Close {openCount > 0 ? `${openCount} Open` : 'All Open'}
      </button>
    </>
  )

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Month Close"
        subtitle="Review and finalize billing periods · open periods show live estimates"
        actions={actions}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Feedback banner */}
        {feedback && (
          <div
            className={cn(
              'flex items-center justify-between rounded-lg border px-4 py-3 text-sm',
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            )}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss"
              className="ml-4 opacity-60 hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        )}

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={cn(cardVariants.hero, 'p-5')}>
            <p className={cn(bodyStyles.caption, 'text-slate-300 mb-1')}>Total Revenue</p>
            <p className={cn(dataStyles.prominent, 'tabular-nums text-white')}>
              {formatCents(totalRevenueCents)}
            </p>
            <p className={cn(bodyStyles.small, 'text-slate-400 mt-1')}>{formatMonth(month)}</p>
          </div>
          <div className={cn(cardVariants.dataPanel, 'p-5')}>
            <p className={cn(bodyStyles.caption, 'text-muted-foreground mb-1')}>Open Periods</p>
            <p className={cn(dataStyles.prominent, 'tabular-nums text-amber-600')}>{openCount}</p>
            <p className={cn(bodyStyles.small, 'text-muted-foreground mt-1')}>showing estimates</p>
          </div>
          <div className={cn(cardVariants.dataPanel, 'p-5')}>
            <p className={cn(bodyStyles.caption, 'text-muted-foreground mb-1')}>Closed</p>
            <p className={cn(dataStyles.prominent, 'tabular-nums text-emerald-600')}>{closedCount}</p>
            <p className={cn(bodyStyles.small, 'text-muted-foreground mt-1')}>finalized + paid</p>
          </div>
        </div>

        {/* Period table */}
        {rows.length === 0 ? (
          <PremiumEmptyState
            icon={CalendarClock}
            headline="No billing periods for this month"
            description="Billing periods are created automatically when clients have usage data. Navigate to a different month or check that usage has been ingested."
          />
        ) : (
          <div className={cn(cardVariants.tableWrapper, 'border overflow-hidden')}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Calls
                    </th>
                    <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Subtotal
                    </th>
                    <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Adj
                    </th>
                    <th className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Total
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const badge = statusBadge(row.status)
                    const adjDisplay =
                      row.adjustmentCents === 0
                        ? '—'
                        : row.adjustmentCents > 0
                          ? `+${formatCents(row.adjustmentCents)}`
                          : formatCents(row.adjustmentCents)
                    return (
                      <tr
                        key={row.periodId}
                        className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {row.clientName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px]',
                              badge.cls
                            )}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {row.callCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {formatCents(row.computedTotalCents)}
                          {row.status === 'open' && (
                            <span className="ml-1 text-[10px] text-amber-600">est</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {adjDisplay}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                          {formatCents(row.finalTotalCents)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {row.status === 'open' && (
                            <button
                              type="button"
                              onClick={() => setDialogId(row.periodId)}
                              className="rounded-md border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted transition-colors"
                            >
                              Close
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ClosePeriodDialog
        row={dialogRow}
        onClose={() => setDialogId(null)}
        onConfirm={async (adjustmentCents, note) => {
          if (!dialogId) return
          await handleClosePeriod(dialogId, adjustmentCents, note)
          setDialogId(null)
        }}
      />
    </div>
  )
}
