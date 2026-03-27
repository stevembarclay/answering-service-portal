'use client'

import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { InvoiceDetailModal } from '@/components/answering-service/InvoiceDetailModal'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import type { BillingEstimate, BillingInvoice } from '@/types/answeringService'

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

function formatPeriodLabel(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'long', year: 'numeric' })
}

function formatPeriodReset(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'long', day: 'numeric' })
}

function statusBadge(status: BillingInvoice['status']) {
  if (status === 'paid')
    return (
      <span className="rounded-full bg-[#f0fdf4] px-2 py-0.5 text-[11px] font-semibold text-[#16a34a]">
        Paid
      </span>
    )
  if (status === 'open')
    return (
      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
        Open
      </span>
    )
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      Closed
    </span>
  )
}

function BillingSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-3 w-28 mb-3" />
        <Skeleton className="h-12 w-36 mb-2" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-12 border-b border-border px-5 flex items-center">
          <Skeleton className="h-3 w-32" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="h-[52px] border-b border-border px-5 flex items-center gap-3">
            <Skeleton className="h-3 w-28 flex-1" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BillingClient() {
  const [estimate, setEstimate] = useState<BillingEstimate | null>(null)
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [est, inv] = await Promise.all([
          parseJson<BillingEstimate>(
            await fetch('/api/answering-service/billing/estimate', { cache: 'no-store' })
          ),
          parseJson<BillingInvoice[]>(
            await fetch('/api/answering-service/billing/invoices', { cache: 'no-store' })
          ),
        ])
        setEstimate(est)
        setInvoices(inv)
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load billing.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const periodLabel = estimate ? formatPeriodLabel(estimate.periodStart) : ''
  const resetLabel = estimate ? formatPeriodReset(estimate.periodEnd) : ''

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Billing"
        subtitle={estimate ? `${periodLabel} billing period · resets ${resetLabel}` : 'View your running estimate and invoices.'}
      />
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-8">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4">
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      ) : null}

      {isLoading ? (
        <BillingSkeleton />
      ) : (
        <>
          {/* Period summary card */}
          {estimate ? (
            <div className="flex flex-wrap items-start gap-8 rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold text-muted-foreground">
                  Estimated Total
                </span>
                <span className="text-[36px] font-bold leading-none text-foreground">
                  {formatCents(estimate.totalCents)}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  14 days remaining in period
                </span>
              </div>

              <div className="w-px self-stretch bg-border" />

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-semibold text-muted-foreground">
                    Calls this period
                  </span>
                  <span className="text-[22px] font-bold text-foreground">
                    {estimate.callCount}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Invoice history */}
          {invoices.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex h-[52px] items-center border-b border-border px-5">
                <span className="text-sm font-semibold text-foreground">Invoice History</span>
              </div>

              {invoices.map((inv, i) => (
                <div
                  key={inv.id}
                  className={`flex h-[52px] w-full items-center gap-3 px-5 ${
                    i < invoices.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(inv)}
                    className="flex flex-1 items-center gap-3 text-left transition-colors hover:bg-transparent"
                  >
                    <span className="flex-1 text-[13px] font-medium text-foreground">
                      {formatPeriodLabel(inv.periodStart)}
                    </span>
                    <span className="text-[13px] font-semibold text-foreground">
                      {formatCents(inv.totalCents)}
                    </span>
                    {statusBadge(inv.status)}
                  </button>
                  {inv.pdfUrl ? (
                    <a
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="ml-2 flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`Download PDF for ${formatPeriodLabel(inv.periodStart)}`}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            </div>
          )}
        </>
      )}

      <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      </div>
      </div>
    </div>
  )
}
