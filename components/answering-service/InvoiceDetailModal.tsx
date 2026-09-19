'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { badgeVariants } from '@/lib/design/color-system'
import type { BillingInvoice } from '@/types/answeringService'

interface InvoiceDetailModalProps {
  invoice: BillingInvoice | null
  onClose: () => void
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function InvoiceDetailModal({ invoice, onClose }: InvoiceDetailModalProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  if (!invoice) return null

  async function handleDownload() {
    if (!invoice) return
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/answering-service/billing/invoices/${invoice.id}/pdf`)
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice-${format(new Date(invoice.periodStart), 'MMMM-yyyy')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={Boolean(invoice)} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="pr-6">
          <div className="flex items-center gap-3">
            <DialogTitle>{format(new Date(invoice.periodStart), 'MMMM yyyy')}</DialogTitle>
            <Badge className={badgeVariants.success}>
              {invoice.status === 'paid' ? 'Paid' : invoice.status}
            </Badge>
          </div>
          <DialogDescription>
            Billing period {format(new Date(invoice.periodStart), 'MMM d')} to{' '}
            {format(new Date(invoice.periodEnd), 'MMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span>{format(new Date(invoice.createdAt), 'MMM d, yyyy')}</span>
          </div>

          {invoice.paidAt ? (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid date</span>
              <span>{format(new Date(invoice.paidAt), 'MMM d, yyyy')}</span>
            </div>
          ) : null}

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">Line Items</p>
            {invoice.lineItems.map((item) => (
              <div key={item.ruleId} className="flex justify-between text-sm">
                <span>
                  {item.ruleName}
                  <span className="block text-xs text-muted-foreground">{item.unitDescription}</span>
                </span>
                <span>{formatMoney(item.subtotalCents)}</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{formatMoney(invoice.totalCents)}</span>
          </div>

          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isDownloading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'Generating PDF…' : 'Download PDF'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
