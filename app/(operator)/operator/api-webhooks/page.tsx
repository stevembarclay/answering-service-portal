import { ApiKeyManager } from '@/components/operator/ApiKeyManager'
import { WebhookDeliveryLog } from '@/components/operator/WebhookDeliveryLog'
import { WebhookManager } from '@/components/operator/WebhookManager'
import { PageHeader } from '@/components/ui/page-header'
import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import { getWebhookDeliveries } from '@/lib/services/operator/webhookService'
import { createClient } from '@/lib/supabase/server'

import {
  createOperatorApiKeyAction,
  createWebhookSubscriptionAction,
  deleteWebhookSubscriptionAction,
  revokeOperatorApiKeyAction,
} from './actions'

export default async function ApiWebhooksPage() {
  const context = await checkOperatorAccessOrThrow()
  const supabase = await createClient()

  const { data: rawKeys } = await supabase
    .from('api_keys')
    .select('id, label, scopes, created_at, revoked_at')
    .eq('operator_org_id', context.operatorOrgId)
    .order('created_at', { ascending: false })

  const { data: rawSubscriptions } = await supabase
    .from('webhook_subscriptions')
    .select('id, url, topics, status, consecutive_failure_count, created_at')
    .eq('operator_org_id', context.operatorOrgId)
    .order('created_at', { ascending: false })

  const keys = (rawKeys ?? []).map((key) => ({
    id: key.id,
    label: key.label as string,
    scopes: (key.scopes as string[]) ?? [],
    createdAt: key.created_at as string,
    revokedAt: (key.revoked_at as string | null) ?? null,
  }))

  const subscriptions = (rawSubscriptions ?? []).map((subscription) => ({
    id: subscription.id,
    url: subscription.url as string,
    topics: (subscription.topics as string[]) ?? [],
    status: subscription.status as string,
    consecutiveFailureCount: Number(subscription.consecutive_failure_count ?? 0),
  }))
  const deliveries = await getWebhookDeliveries(context.operatorOrgId, 50)

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="API & Webhooks"
        subtitle="API keys, webhook endpoints, and delivery logs"
      />
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* API Keys card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Operator API Keys</span>
        </div>
        <div className="p-5">
          <ApiKeyManager
            keys={keys}
            onCreateKey={createOperatorApiKeyAction}
            onRevokeKey={revokeOperatorApiKeyAction}
            isAdmin={context.role === 'admin'}
            availableScopes={['calls:read', 'billing:read', 'calls:write', 'usage:write', 'on_call:read']}
          />
        </div>
      </div>

      {/* Webhooks card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Webhooks</span>
        </div>
        <div className="p-5">
          <WebhookManager
            subscriptions={subscriptions}
            onCreateSub={createWebhookSubscriptionAction}
            onDeleteSub={deleteWebhookSubscriptionAction}
            isAdmin={context.role === 'admin'}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Recent Deliveries</span>
        </div>
        <div className="p-5">
          <WebhookDeliveryLog deliveries={deliveries} />
        </div>
      </div>
      </div>
      </div>
    </div>
  )
}
