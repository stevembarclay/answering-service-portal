'use server'

import { redirect } from 'next/navigation'
import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { sendInvite } from '@/lib/services/operator/inviteService'

export type NewClientFormState = { error: string } | null

export async function createClientAction(
  _prevState: NewClientFormState,
  formData: FormData
): Promise<NewClientFormState> {
  const context = await checkOperatorAccessOrThrow()

  const name = (formData.get('name') as string | null)?.trim()
  const email = (formData.get('email') as string | null)?.trim()

  if (!name) return { error: 'Business name is required.' }
  if (!email) return { error: 'Contact email is required.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Please enter a valid email address.' }

  const supabase = await createClient()

  // 1. Create the business
  const { data: biz, error: bizError } = await supabase
    .from('businesses')
    .insert({
      name,
      enabled_modules: ['answering_service'],
      operator_org_id: context.operatorOrgId,
    })
    .select('id')
    .single()

  if (bizError || !biz) {
    return { error: `Failed to create business: ${bizError?.message ?? 'unknown error'}` }
  }

  const businessId = biz.id as string
  const serviceRole = createServiceRoleClient()

  // 2. Invite the user
  let invitedUserId: string
  let emailSent = false
  try {
    const inviteResult = await sendInvite({
      email,
      businessId,
      operatorOrgId: context.operatorOrgId,
    })
    invitedUserId = inviteResult.userId
    emailSent = inviteResult.emailSent
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    if (message.toLowerCase().includes('already registered')) {
      return {
        error: `User ${email} already has an account. Business "${name}" (ID: ${businessId}) was created successfully. Visit the client detail page to manage their access.`,
      }
    }
    return {
      error: `Business "${name}" was created (ID: ${businessId}), but the invite failed: ${message}`,
    }
  }

  // 3. Link user to business
  const { error: ubError } = await serviceRole.from('users_businesses').insert({
    user_id: invitedUserId,
    business_id: businessId,
    role: 'owner',
  })

  if (ubError) {
    return {
      error: `Business and invite created (ID: ${businessId}), but failed to link user: ${ubError.message}`,
    }
  }

  const destination = emailSent
    ? `/operator/clients/${businessId}`
    : `/operator/clients/${businessId}?inviteEmail=not-sent`

  redirect(destination)
}
