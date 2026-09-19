'use server'

import { revalidatePath } from 'next/cache'
import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import { sendMagicLink } from '@/lib/services/operator/inviteService'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'

export type ResendInviteState = { success?: boolean; error?: string } | null

export async function resendInviteAction(
  _prevState: ResendInviteState,
  formData: FormData
): Promise<ResendInviteState> {
  const businessId = formData.get('businessId') as string | null
  if (!businessId) return { error: 'Missing business ID.' }

  const context = await checkOperatorAccessOrThrow()
  const serviceRole = createServiceRoleClient()

  // Verify business belongs to this operator
  const { data: biz } = await serviceRole
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('operator_org_id', context.operatorOrgId)
    .maybeSingle()

  if (!biz) return { error: 'Client not found.' }

  // Look up the owner's user_id
  const { data: ubRow } = await serviceRole
    .from('users_businesses')
    .select('user_id')
    .eq('business_id', businessId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (!ubRow?.user_id) return { error: 'No owner found for this client.' }

  // Fetch email via admin API
  const { data: authData } = await serviceRole.auth.admin.getUserById(
    ubRow.user_id as string
  )
  const email = authData?.user?.email
  if (!email) return { error: 'Could not find owner email.' }

  try {
    const { emailSent } = await sendMagicLink({
      email,
      operatorOrgId: context.operatorOrgId,
    })

    if (!emailSent) {
      return {
        error: 'Email service not configured. Add RESEND_API_KEY to your environment.',
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error.'
    if (message.toLowerCase().includes('already registered')) {
      return {
        error:
          'This user already has an active account — they can sign in directly at the portal.',
      }
    }
    return { error: sanitizeErrorMessage(error) }
  }

  revalidatePath(`/operator/clients/${businessId}`)
  return { success: true }
}
