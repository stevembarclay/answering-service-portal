'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { BillingInvoice } from '@/types/answeringService'
import { format } from 'date-fns'
import { Eye } from '@phosphor-icons/react'

interface BillingTableProps {
  invoices: BillingInvoice[]
  isLoading?: boolean
  onViewInvoice?: (invoice: BillingInvoice) => void
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function BillingTable({ invoices, isLoading, onViewInvoice }: BillingTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-input">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-b border-input p-4 last:border-b-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const handleViewInvoice = (invoice: BillingInvoice) => {
    onViewInvoice?.(invoice)
  }

  return (
    <div className="space-y-3">
      {invoices.length === 0 ? (
        <div className="rounded-lg border border-input p-6 text-center text-muted-foreground">
          No invoices found
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-lg border border-input p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {format(new Date(invoice.periodStart), 'MMMM yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.callCount} calls
                    {invoice.paidAt ? ` · Paid ${format(new Date(invoice.paidAt), 'MMM d, yyyy')}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                    {invoice.status}
                  </Badge>
                  <p className="mt-2 font-semibold text-foreground">{formatMoney(invoice.totalCents)}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)} className="mt-3 h-8">
                <Eye className="mr-1 h-4 w-4" />
                View
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
