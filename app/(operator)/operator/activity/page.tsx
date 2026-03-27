import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { OperatorActivityFeed } from '@/components/operator/OperatorActivityFeed'
import type { ActivityEvent } from '@/components/operator/OperatorActivityFeed'

export default async function ActivityPage() {
  const context = await checkOperatorAccessOrThrow()
  const supabase = await createClient()

  const { data } = await supabase
    .from('call_logs')
    .select('id, business_id, timestamp, call_type, priority, portal_status, businesses(name)')
    .eq('operator_org_id', context.operatorOrgId)
    .order('timestamp', { ascending: false })
    .limit(30)

  // Normalize Supabase join — PostgREST may return businesses as array or object
  const rawRows = (data ?? []) as Array<{
    id: string
    business_id: string
    timestamp: string
    call_type: string
    priority: string
    portal_status: string
    businesses: { name: string } | { name: string }[] | null
  }>

  const initialEvents: ActivityEvent[] = rawRows.map((row) => ({
    id: row.id,
    business_id: row.business_id,
    timestamp: row.timestamp,
    call_type: row.call_type,
    priority: row.priority,
    portal_status: row.portal_status,
    businesses: Array.isArray(row.businesses) ? (row.businesses[0] ?? null) : row.businesses,
  }))

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Live feed of calls across all your clients.
        </p>
      </div>

      <OperatorActivityFeed
        initialEvents={initialEvents}
        operatorOrgId={context.operatorOrgId}
      />
    </div>
  )
}
