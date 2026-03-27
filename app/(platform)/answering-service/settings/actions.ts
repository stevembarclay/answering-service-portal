'use server'

import { revalidatePath } from 'next/cache'

import { getBusinessContext } from '@/lib/auth/server'
import { createApiKey, revokeApiKey } from '@/lib/services/operator/apiKeyService'
import { createClient } from '@/lib/supabase/server'

export async function createBusinessApiKeyAction(label: string) {
  const context = await getBusinessContext()
  if (!context) {
    throw new Error('Unauthorized')
  }

  return createApiKey({
    label,
    scopes: ['calls:read', 'billing:read'],
    businessId: context.businessId,
    createdBy: context.userId,
  })
}

export async function revokeBusinessApiKeyAction(keyId: string) {
  const context = await getBusinessContext()
  if (!context) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()
  const { data: key } = await supabase
    .from('api_keys')
    .select('id')
    .eq('id', keyId)
    .eq('business_id', context.businessId)
    .maybeSingle()

  if (!key) {
    throw new Error('Key not found or does not belong to this business.')
  }

  await revokeApiKey(keyId)
  revalidatePath('/answering-service/settings')
}
