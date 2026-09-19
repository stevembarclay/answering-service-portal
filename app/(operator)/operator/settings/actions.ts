'use server'

import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import { updateOperatorBranding } from '@/lib/services/operator/operatorService'

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

  try {
    await updateOperatorBranding(context.operatorOrgId, { name, color, logoUrl, supportEmail, customDomain })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save settings.'
    return { error: message }
  }

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
