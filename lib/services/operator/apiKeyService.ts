import { generateRawApiKey, hashApiKey } from '@/lib/api/bearerAuth'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import type { ApiKey } from '@/types/operator'

interface CreateKeyInput {
  label: string
  scopes: string[]
  allowedIps?: string[]
  expiresAt?: string
  businessId?: string
  operatorOrgId?: string
  createdBy: string
}

interface CreateKeyResult {
  rawKey: string
  keyId: string
}

interface ApiKeyRow {
  id: string
  business_id: string | null
  operator_org_id: string | null
  label: string
  scopes: string[]
  allowed_ips: string[] | null
  expires_at: string | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export async function createApiKey(input: CreateKeyInput): Promise<CreateKeyResult> {
  if (input.businessId && input.scopes.includes('usage:write')) {
    throw new Error('usage:write scope cannot be issued to a business-scoped API key.')
  }
  if (input.businessId && input.scopes.includes('on_call:read')) {
    throw new Error('on_call:read scope cannot be issued to a business-scoped API key.')
  }

  const rawKey = generateRawApiKey()
  const keyHash = hashApiKey(rawKey)
  // api_keys has no INSERT RLS policy — service role required for writes
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      business_id: input.businessId ?? null,
      operator_org_id: input.operatorOrgId ?? null,
      key_hash: keyHash,
      label: input.label,
      scopes: input.scopes,
      allowed_ips: input.allowedIps ?? null,
      expires_at: input.expiresAt ?? null,
      created_by: input.createdBy,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error('Failed to create API key.')
  }

  return { rawKey, keyId: (data as { id: string }).id }
}

export async function revokeApiKey(keyId: string): Promise<void> {
  // api_keys has no UPDATE RLS policy — service role required for writes
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)

  if (error) {
    throw new Error('Failed to revoke API key.')
  }
}

export async function listApiKeysForBusiness(businessId: string): Promise<ApiKey[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, business_id, operator_org_id, label, scopes, allowed_ips, expires_at, last_used_at, revoked_at, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Failed to list API keys.')
  }

  return ((data ?? []) as ApiKeyRow[]).map((key) => ({
    id: key.id,
    businessId: key.business_id,
    operatorOrgId: key.operator_org_id,
    label: key.label,
    scopes: key.scopes,
    allowedIps: key.allowed_ips,
    expiresAt: key.expires_at,
    lastUsedAt: key.last_used_at,
    revokedAt: key.revoked_at,
    createdAt: key.created_at,
  }))
}
