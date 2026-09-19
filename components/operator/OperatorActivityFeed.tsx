'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export interface ActivityEvent {
  id: string
  business_id: string
  timestamp: string
  call_type: string
  priority: string
  portal_status: string
  businesses: { name: string } | null
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function PriorityDot({ priority }: { priority: string }) {
  if (priority === 'high') return <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
  if (priority === 'medium') return <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
  return <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground" />
}

interface OperatorActivityFeedProps {
  initialEvents: ActivityEvent[]
  operatorOrgId: string
}

export function OperatorActivityFeed({ initialEvents, operatorOrgId }: OperatorActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>(initialEvents)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`operator_activity_${operatorOrgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_logs',
          filter: `operator_org_id=eq.${operatorOrgId}`,
        },
        (payload) => {
          const newEvent = payload.new as ActivityEvent
          setEvents((prev) => [newEvent, ...prev].slice(0, 50))
          if (newEvent.priority === 'high') {
            toast(`Urgent call — ${newEvent.businesses?.name ?? 'Unknown client'}`)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setSubscribed(true)
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') setSubscribed(false)
      })

    return () => { void supabase.removeChannel(channel) }
  }, [operatorOrgId])

  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex h-[52px] items-center justify-between border-b border-border px-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Live Activity</span>
          {subscribed ? (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          ) : null}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-[13px] text-muted-foreground">
            No activity yet — calls will appear here as they come in.
          </p>
        </div>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0"
          >
            <PriorityDot priority={event.priority} />
            <span className="w-28 sm:w-40 shrink-0 truncate text-[13px] font-medium text-foreground">
              {event.businesses?.name ?? 'Unknown client'}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground capitalize">
              {event.call_type.replace(/-/g, ' ')}
            </span>
            <span className="shrink-0 text-[12px] text-muted-foreground">
              {relativeTime(event.timestamp)}
            </span>
            <Link href={`/operator/clients/${event.business_id}`}>
              <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Link>
          </div>
        ))
      )}
    </div>
  )
}
