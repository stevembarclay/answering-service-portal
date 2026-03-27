'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ClientDetail, ClientOnCallStatus } from '@/lib/services/operator/operatorService'
import { type ResendInviteState } from '@/app/(operator)/operator/clients/[id]/actions'

export function ClientDetailTabs({
  client,
  onCallStatus,
  resendInviteAction,
  inviteWarning,
}: {
  client: ClientDetail
  onCallStatus: ClientOnCallStatus
  resendInviteAction?: (
    _prevState: ResendInviteState,
    formData: FormData
  ) => Promise<ResendInviteState>
  inviteWarning?: string
}) {
  const { healthBreakdown: hs } = client
  const [resendState, setResendState] = useState<ResendInviteState>(null)
  const [resendPending, setResendPending] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)

  async function handleResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!resendInviteAction) return
    setResendPending(true)
    setResendState(null)
    try {
      const fd = new FormData(e.currentTarget)
      const result = await resendInviteAction(null, fd)
      setResendState(result)
    } finally {
      setResendPending(false)
    }
  }

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="calls">Calls</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ScoreCard label="Login recency" value={hs.loginRecency} max={40} />
          <ScoreCard label="Open high-priority" value={hs.unresolvedHighPriority} max={30} />
          <ScoreCard label="Reviewed in 7d" value={hs.reviewedWithin7d} max={20} />
          <ScoreCard label="Onboarding" value={hs.onboardingComplete} max={10} />
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <dt className="text-slate-500">Last login</dt>
          <dd>{client.lastLoginAt
            ? formatDistanceToNow(new Date(client.lastLoginAt), { addSuffix: true })
            : 'Never'}</dd>
          <dt className="text-slate-500">Open high-priority calls</dt>
          <dd>{client.openHighPriorityCount}</dd>
          <dt className="text-slate-500">Calls this month</dt>
          <dd>{client.callsThisMonth} (vs {client.callsLastMonth} last month)</dd>
          <dt className="text-slate-500">Onboarding</dt>
          <dd>{client.onboardingStatus ?? 'Not started'}</dd>
        </dl>
        {/* Who to Call (read-only) */}
        <div className="rounded-md border border-slate-200 p-4">
          <h3 className="mb-2 text-sm font-semibold">Who to Call</h3>
          {onCallStatus.shiftName ? (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <dt className="text-slate-500">Shift</dt>
              <dd>{onCallStatus.shiftName}</dd>
              <dt className="text-slate-500">Contact</dt>
              <dd>{onCallStatus.contactName ?? '—'}</dd>
              {onCallStatus.contactRole && (
                <>
                  <dt className="text-slate-500">Role</dt>
                  <dd>{onCallStatus.contactRole}</dd>
                </>
              )}
              {onCallStatus.contactPhone && (
                <>
                  <dt className="text-slate-500">Phone</dt>
                  <dd>{onCallStatus.contactPhone}</dd>
                </>
              )}
            </dl>
          ) : (
            <p className="text-sm text-slate-400">No coverage scheduled right now.</p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="billing" className="pt-4">
        <p className="text-sm text-slate-500">Usage data will appear here once billing ingest is set up.</p>
        <div className="mt-4 space-y-2">
          {client.billingRules.map((rule) => (
            <div key={rule.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <span className="font-medium">{rule.name}</span>
              <span className="ml-2 text-slate-500">{rule.type}</span>
              {!rule.active && <span className="ml-2 text-orange-500">(inactive)</span>}
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="calls" className="pt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 pr-4 font-medium">Time</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Priority</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {client.recentCalls.map((call) => (
                <tr key={call.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 whitespace-nowrap text-slate-500">
                    {formatDistanceToNow(new Date(call.timestamp), { addSuffix: true })}
                  </td>
                  <td className="py-2 pr-4">{call.callType}</td>
                  <td className="py-2 pr-4">{call.priority}</td>
                  <td className="py-2">{call.portalStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <a
            href={`/api/operator/clients/${client.id}/export/calls?start=${thirtyDaysAgo}&end=${today}`}
            download
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Export last 30 days ↓
          </a>
        </div>
      </TabsContent>

      <TabsContent value="settings" className="space-y-6 pt-4">
        {inviteWarning ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-[13px] text-amber-800 dark:text-amber-300">{inviteWarning}</p>
          </div>
        ) : null}
        <div>
          <h3 className="mb-2 text-sm font-semibold">API Keys</h3>
          {client.apiKeys.filter((k) => !k.revokedAt).map((key) => (
            <div key={key.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <span className="font-medium">{key.label}</span>
              <span className="ml-2 text-slate-400">{key.scopes.join(', ')}</span>
            </div>
          ))}
          {client.apiKeys.filter((k) => !k.revokedAt).length === 0 && (
            <p className="text-sm text-slate-400">No active API keys.</p>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Health Score Override</h3>
          <p className="text-sm text-slate-500">
            {client.healthScoreOverride !== null
              ? `Currently overridden to ${client.healthScoreOverride}`
              : 'No override — formula score is used.'}
          </p>
        </div>
        {resendInviteAction && (
          <div>
            <h3 className="mb-1 text-sm font-semibold">Portal Access</h3>
            {client.ownerEmail && (
              <p className="mb-3 text-sm text-slate-500">
                Owner: <span className="font-medium text-slate-700">{client.ownerEmail}</span>
              </p>
            )}
            <form onSubmit={handleResend}>
              <input type="hidden" name="businessId" value={client.id} />
              <button
                type="submit"
                disabled={resendPending}
                className="flex h-8 items-center rounded-md border border-border bg-muted px-3 text-[13px] font-medium text-foreground transition-opacity disabled:opacity-60 hover:bg-muted/80"
              >
                {resendPending ? 'Sending…' : 'Resend invite email'}
              </button>
            </form>
            {resendState?.success && (
              <p className="mt-2 text-[13px] text-emerald-600">Invite sent successfully.</p>
            )}
            {resendState?.error && (
              <p className="mt-2 text-[13px] text-rose-600">{resendState.error}</p>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

function ScoreCard({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">/{max} {label}</div>
    </div>
  )
}
