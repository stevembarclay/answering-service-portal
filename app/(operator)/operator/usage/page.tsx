import { CallUploadPanel } from '@/components/operator/CallUploadPanel'
import { UsageHistory } from '@/components/operator/UsageHistory'
import { UsageUploadPanel } from '@/components/operator/UsageUploadPanel'
import { PageHeader } from '@/components/ui/page-header'
import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'

export default async function UsagePage() {
  const context = await checkOperatorAccessOrThrow()
  const supabase = await createClient()

  const { data: history } = await supabase
    .from('usage_periods')
    .select(
      'id, business_id, period_date, total_calls, total_minutes, source, status, error_detail, created_at'
    )
    .eq('operator_org_id', context.operatorOrgId)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Usage"
        subtitle="Upload and manage call data from your integrations"
      />
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* Upload panels */}
      {context.role === 'admin' ? (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex h-[52px] items-center border-b border-border px-5">
              <span className="text-sm font-semibold text-foreground">Upload CSV</span>
            </div>
            <div className="p-5">
              <UsageUploadPanel />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex h-[52px] items-center border-b border-border px-5">
              <span className="text-sm font-semibold text-foreground">Upload Call Logs</span>
            </div>
            <div className="p-5">
              <CallUploadPanel />
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Admin role required to upload usage data.
        </p>
      )}

      {/* Upload history */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Upload History</span>
        </div>
        <div className="p-5">
          <UsageHistory rows={history ?? []} />
        </div>
      </div>
      </div>
      </div>
    </div>
  )
}
