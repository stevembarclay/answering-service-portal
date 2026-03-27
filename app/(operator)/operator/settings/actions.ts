'use server'

import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export type BrandingFormState = { success?: boolean; error?: string } | null

export async function saveBrandingAction(
  _prevState: BrandingFormState,
  formData: FormData
): Promise<BrandingFormState> {
  const context = await checkOperatorAccessOrThrow()

  const name = (formData.get('name') as string | null)?.trim() || null
  const color = (formData.get('color') as string | null)?.trim() || null
  const logoUrl = (formData.get('logoUrl') as string | null)?.trim() || null
  const supportEmail = (formData.get('supportEmail') as string | null)?.trim() || null
  const customDomain = (formData.get('customDomain') as string | null)?.trim() || null

  // Validate color
  if (color && !/^#[0-9a-fA-F]{3,8}$/.test(color)) {
    return { error: 'Brand color must be a valid hex value (e.g. #334155 or #abc).' }
  }

  // Validate custom domain format (only if provided)
  const DOMAIN_RE = /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i
  if (customDomain && !DOMAIN_RE.test(customDomain)) {
    return { error: 'Invalid domain format.' }
  }

  const serviceRole = createServiceRoleClient()

  // Fetch current values to merge-patch JSONB columns
  const { data: current, error: fetchError } = await serviceRole
    .from('operator_orgs')
    .select('branding, settings')
    .eq('id', context.operatorOrgId)
    .single()

  if (fetchError) return { error: 'Failed to load current settings.' }

  const currentBranding = (current?.branding ?? {}) as Record<string, unknown>
  const currentSettings = (current?.settings ?? {}) as Record<string, unknown>

  const newBranding = {
    ...currentBranding,
    ...(color !== null ? { primary_color: color } : {}),
    ...(logoUrl !== null ? { logo_url: logoUrl || null } : {}),
    ...(customDomain !== null ? { custom_domain: customDomain || null } : {}),
  }

  const newSettings = {
    ...currentSettings,
    ...(supportEmail !== null ? { support_email: supportEmail || null } : {}),
  }

  const updateData: Record<string, unknown> = {
    branding: newBranding,
    settings: newSettings,
  }
  if (name) updateData.name = name

  const { error: updateError } = await serviceRole
    .from('operator_orgs')
    .update(updateData)
    .eq('id', context.operatorOrgId)

  if (updateError) return { error: `Failed to save: ${updateError.message}` }

  // Register the custom domain with Vercel if provided.
  // VERCEL_API_TOKEN / VERCEL_PROJECT_ID are optional — skip silently in local dev.
  const vercelToken = process.env.VERCEL_API_TOKEN
  const vercelProjectId = process.env.VERCEL_PROJECT_ID

  if (vercelToken && vercelProjectId && customDomain) {
    try {
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: customDomain }),
        }
      )
      // 200 = added, 409 = already exists (fine), anything else = log warning
      if (!res.ok && res.status !== 409) {
        const { logger } = await import('@/lib/utils/logger')
        logger.warn('Vercel domain add failed', { status: res.status, body: await res.text() })
        // Don't throw — domain saved in DB, operator can retry
      }
    } catch (err) {
      const { logger } = await import('@/lib/utils/logger')
      logger.warn('Vercel API unreachable', { err })
      // Don't throw
    }
  }

  return { success: true }
}
