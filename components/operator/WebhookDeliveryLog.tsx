'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { WebhookDeliveryRow } from '@/lib/services/operator/webhookService'

export function WebhookDeliveryLog({ deliveries }: { deliveries: WebhookDeliveryRow[] }) {
  const router = useRouter()
  const [isRetryingAll, startRetryAllTransition] = useTransition()
  const [retryingId, setRetryingId] = useState<string | null>(null)

  function retryAllPending() {
    startRetryAllTransition(async () => {
      const response = await fetch('/api/operator/webhooks/retry-all', { method: 'POST' })
      if (!response.ok) {
        toast.error('Failed to retry pending deliveries.')
        return
      }

      toast.success('Pending retries queued.')
      router.refresh()
    })
  }

  async function retryDelivery(deliveryId: string) {
    setRetryingId(deliveryId)
    try {
      const response = await fetch(`/api/operator/webhooks/${deliveryId}/retry`, { method: 'POST' })
      if (!response.ok) {
        toast.error('Failed to retry delivery.')
        return
      }

      toast.success('Retry started.')
      router.refresh()
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={retryAllPending}
          disabled={isRetryingAll}
          className="rounded-lg border border-border px-3 py-1.5 text-[13px] text-foreground transition-opacity disabled:opacity-60"
        >
          {isRetryingAll ? 'Retrying…' : 'Retry All Pending'}
        </button>
      </div>

      {deliveries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent webhook deliveries.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>HTTP code</TableHead>
              <TableHead>Subscription URL</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((delivery) => {
              const status = getDeliveryStatus(delivery)

              return (
                <TableRow key={delivery.id}>
                  <TableCell>{formatTimestamp(delivery.createdAt)}</TableCell>
                  <TableCell>{delivery.topic}</TableCell>
                  <TableCell>{status}</TableCell>
                  <TableCell>{delivery.responseStatus ?? '—'}</TableCell>
                  <TableCell className="max-w-[280px] truncate">{delivery.subscriptionUrl}</TableCell>
                  <TableCell>
                    {status === '✓ delivered' ? null : (
                      <button
                        type="button"
                        onClick={() => retryDelivery(delivery.id)}
                        disabled={retryingId === delivery.id}
                        className="text-[13px] text-primary disabled:opacity-60"
                      >
                        {retryingId === delivery.id ? 'Retrying…' : 'Retry'}
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function getDeliveryStatus(delivery: WebhookDeliveryRow): string {
  if (delivery.deliveredAt) {
    return '✓ delivered'
  }

  if (delivery.nextRetryAt) {
    return '⟳ pending retry'
  }

  return '✗ failed dead'
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
