'use server'

import { revalidatePath } from 'next/cache'

import { getBusinessContext } from '@/lib/auth/server'
import { createApiKey, revokeApiKey, verifyApiKeyOwnership } from '@/lib/services/operator/apiKeyService'

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

  const belongs = await verifyApiKeyOwnership(keyId, context.businessId)
  if (!belongs) {
    throw new Error('Key not found or does not belong to this business.')
  }

  await revokeApiKey(keyId)
  revalidatePath('/answering-service/settings')
}
