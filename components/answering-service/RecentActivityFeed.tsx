'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { Phone, File as FileText } from '@phosphor-icons/react'
import type { CallLog, BillingInvoice } from '@/types/answeringService'

interface RecentActivityFeedProps {
  calls?: CallLog[]
  invoices?: BillingInvoice[]
  isLoading?: boolean
}

export function RecentActivityFeed({
  calls = [],
  invoices = [],
  isLoading = false,
}: RecentActivityFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  // Combine and sort activities by timestamp
  const activities: Array<{
    type: 'call' | 'invoice'
    timestamp: string
    data: CallLog | BillingInvoice
  }> = [
    ...calls.map(call => ({ type: 'call' as const, timestamp: call.timestamp, data: call })),
    ...invoices.map(inv => ({ type: 'invoice' as const, timestamp: inv.createdAt, data: inv })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            activities.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-start gap-3 pb-3 border-b border-input last:border-0">
                {activity.type === 'call' ? (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {activity.type === 'call' ? (
                    <>
                      <p className="text-sm text-foreground">
                        {(activity.data as CallLog).direction === 'inbound' ? 'Inbound' : 'Outbound'} call
                        {` ${(activity.data as CallLog).telephonyStatus}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date((activity.data as CallLog).timestamp), 'MMM d, h:mm a')} • {Math.floor((activity.data as CallLog).durationSeconds / 60)}m {(activity.data as CallLog).durationSeconds % 60}s
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-foreground">
                        Invoice {format(new Date((activity.data as BillingInvoice).periodStart), 'MMMM yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date((activity.data as BillingInvoice).createdAt), 'MMM d, yyyy')} • ${((activity.data as BillingInvoice).totalCents / 100).toFixed(2)} • {(activity.data as BillingInvoice).status}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
