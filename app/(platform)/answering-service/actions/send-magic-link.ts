'use server'

// Placeholder - SMS integration to be completed
export async function sendMagicLinkSMS(phoneNumber: string, businessId: string) {
  // TODO: Implement SMS provider + Supabase magic link
  // For now, just simulate success
  await new Promise(resolve => setTimeout(resolve, 1000))

  return { success: true }
}
