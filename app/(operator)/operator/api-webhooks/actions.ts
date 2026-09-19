'use server'

import { randomBytes } from 'crypto'

import { revalidatePath } from 'next/cache'

import { getOperatorContext } from '@/lib/auth/server'
import { createApiKey, revokeApiKey } from '@/lib/services/operator/apiKeyService'
import { createClient } from '@/lib/supabase/server'

export async function createOperatorApiKeyAction(label: string, scopes: string[]) {
  const context = await getOperatorContext()
  if (!context || context.role !== 'admin') {
    throw new Error('Forbidden')
  }

  const result = await createApiKey({
    label,
    scopes,
    operatorOrgId: context.operatorOrgId,
    createdBy: context.userId,
  })

  revalidatePath('/operator/api-webhooks')
  return result
}

export async function revokeOperatorApiKeyAction(keyId: string) {
  const context = await getOperatorContext()
  if (!context || context.role !== 'admin') {
    throw new Error('Forbidden')
  }

  const supabase = await createClient()
  const { data: key } = await supabase
    .from('api_keys')
    .select('id')
    .eq('id', keyId)
    .eq('operator_org_id', context.operatorOrgId)
    .maybeSingle()

  if (!key) {
    throw new Error('API key not found.')
  }

  await revokeApiKey(keyId)
  revalidatePath('/operator/api-webhooks')
}

export async function createWebhookSubscriptionAction(url: string, topics: string[]) {
  const context = await getOperatorContext()
  if (!context || context.role !== 'admin') {
    throw new Error('Forbidden')
  }

  const secret = randomBytes(32).toString('hex')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('webhook_subscriptions')
    .insert({
      operator_org_id: context.operatorOrgId,
      url,
      secret,
      topics,
      status: 'active',
    })
    .select('id, url, topics, status, created_at')
    .single()

  if (error || !data) {
    throw new Error('Failed to create webhook subscription.')
  }

  revalidatePath('/operator/api-webhooks')
  return { ...(data as { id: string; url: string; topics: string[]; status: string; created_at: string }), secret }
}

export async function deleteWebhookSubscriptionAction(subscriptionId: string) {
  const context = await getOperatorContext()
  if (!context || context.role !== 'admin') {
    throw new Error('Forbidden')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('webhook_subscriptions')
    .delete()
    .eq('id', subscriptionId)
    .eq('operator_org_id', context.operatorOrgId)

  if (error) {
    throw new Error('Failed to delete webhook subscription.')
  }

  revalidatePath('/operator/api-webhooks')
}
