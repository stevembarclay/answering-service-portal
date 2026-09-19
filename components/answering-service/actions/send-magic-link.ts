'use server'

export async function sendMagicLinkSMS(phoneNumber: string, businessId: string): Promise<{ success: boolean; error?: string }> {
  await new Promise(resolve => setTimeout(resolve, 1000))
  return { success: true }
}

