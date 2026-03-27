'use client'

import { format } from 'date-fns'
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
  if (!invoice) return null

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
        </div>
      </DialogContent>
    </Dialog>
  )
}
