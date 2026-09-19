'use client'

import { useState, useEffect } from 'react'
import type { MonthCloseRow } from '@/lib/services/operator/monthCloseService'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { bodyStyles } from '@/lib/design/typography-system'
import { cn } from '@/lib/utils/cn'

interface ClosePeriodDialogProps {
  row: MonthCloseRow | null
  onClose: () => void
  onConfirm: (adjustmentCents: number, note: string) => Promise<void>
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function ClosePeriodDialog({ row, onClose, onConfirm }: ClosePeriodDialogProps) {
  const [adjInput, setAdjInput] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form whenever a new row is opened
  useEffect(() => {
    if (row) {
      setAdjInput('')
      setNote('')
      setError(null)
    }
  }, [row?.periodId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const raw = adjInput.trim().replace(/[$,]/g, '')
    const parsed = raw === '' ? 0 : parseFloat(raw)
    if (raw !== '' && (isNaN(parsed) || !isFinite(parsed))) {
      setError('Enter a valid dollar amount, e.g. -10 or 5.50')
      return
    }
    const adjustmentCents = Math.round(parsed * 100)

    setSubmitting(true)
    try {
      await onConfirm(adjustmentCents, note.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close period.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!row) return null

  const adjParsed =
    adjInput.trim() === '' ? 0 : parseFloat(adjInput.replace(/[$,]/g, '')) || 0
  const previewCents = row.computedTotalCents + Math.round(adjParsed * 100)

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogTitle>Close Period — {row.clientName}</DialogTitle>
        <DialogDescription>
          Confirm and freeze the billing total. Optionally add a credit or charge adjustment.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Computed total — read only */}
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
            <p className={cn(bodyStyles.caption, 'text-muted-foreground')}>Computed subtotal</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {formatCents(row.computedTotalCents)}
            </p>
            <p className={cn(bodyStyles.small, 'mt-0.5 text-muted-foreground')}>
              Based on {row.callCount.toLocaleString()} call{row.callCount !== 1 ? 's' : ''} · will be
              recomputed at close time
            </p>
          </div>

          {/* Adjustment amount */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="close-adj-amount"
              className={cn(bodyStyles.caption, 'font-medium text-foreground')}
            >
              Adjustment (optional)
            </label>
            <input
              id="close-adj-amount"
              type="text"
              inputMode="decimal"
              value={adjInput}
              onChange={(e) => setAdjInput(e.target.value)}
              placeholder="e.g. -10 or +5.00"
              aria-describedby={error ? 'close-period-error' : undefined}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className={cn(bodyStyles.small, 'text-muted-foreground')}>
              Negative for credits, positive for extra charges.
            </p>
          </div>

          {/* Adjustment note */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="close-adj-note"
              className={cn(bodyStyles.caption, 'font-medium text-foreground')}
            >
              Note (optional)
            </label>
            <input
              id="close-adj-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Promotional discount"
              maxLength={200}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Live final total preview */}
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <span className={cn(bodyStyles.caption, 'font-medium text-foreground')}>
              Final total
            </span>
            <span className="text-xl font-bold tabular-nums text-foreground">
              {formatCents(previewCents)}
            </span>
          </div>

          {error && (
            <p id="close-period-error" role="alert" className="text-sm text-rose-600">
              {error}
            </p>
          )}

          {/* Actions — affirmative left, cancel right */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-10 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {submitting ? 'Closing…' : 'Close Period'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 h-10 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
