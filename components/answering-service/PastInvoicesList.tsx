'use client'

import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cardBorderHover, cardVariants } from '@/lib/design/card-system'
import { badgeVariants } from '@/lib/design/color-system'
import { hoverTransitions } from '@/lib/design/motion-system'
import { bodyStyles, headingStyles } from '@/lib/design/typography-system'
import { cn } from '@/lib/utils/cn'
import type { BillingInvoice } from '@/types/answeringService'

interface PastInvoicesListProps {
  invoices: BillingInvoice[]
  onSelectInvoice: (invoice: BillingInvoice) => void
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function PastInvoicesList({ invoices, onSelectInvoice }: PastInvoicesListProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className={`${headingStyles.h3.base} text-slate-900`}>Past invoices</h2>
        <p className={`${bodyStyles.small} text-slate-600`}>Finalized billing periods, newest first.</p>
      </div>
      <div className="space-y-3">
        {invoices.map((invoice) => (
          <article
            key={invoice.id}
            className={cn(cardVariants.interactive, cardBorderHover.neutral, hoverTransitions.card, 'p-4')}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className={`${bodyStyles.small} font-semibold text-slate-900`}>
                  {(() => {
                    const [y, m] = invoice.periodStart.slice(0, 7).split('-')
                    return format(new Date(parseInt(y), parseInt(m) - 1, 1), 'MMMM yyyy')
                  })()}
                </h3>
                <p className={`${bodyStyles.caption} text-slate-500`}>
                  {invoice.callCount} call{invoice.callCount === 1 ? '' : 's'}
                  {invoice.paidAt ? ` · Paid ${format(new Date(invoice.paidAt), 'MMM d, yyyy')}` : ''}
                </p>
              </div>
              <div className="space-y-2 text-right">
                <Badge className={badgeVariants.success}>PAID</Badge>
                <p className={`${bodyStyles.small} font-semibold text-slate-900`}>
                  {formatMoney(invoice.totalCents)}
                </p>
              </div>
            </div>
            <Button type="button" variant="ghost" className="mt-3 px-0" onClick={() => onSelectInvoice(invoice)}>
              View invoice →
            </Button>
          </article>
        ))}
      </div>
    </section>
  )
}
