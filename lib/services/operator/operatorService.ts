import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { createModuleLogger } from '@/lib/utils/logger'

const logger = createModuleLogger('operatorService')
import { loadSchedulerData, getBusinessTimezone } from '@/lib/services/answering-service/onCallService'
import { resolveActiveShift } from '@/lib/services/answering-service/onCallScheduler'

export interface OperatorSetupStatus {
  hasBranding: boolean
  hasTemplate: boolean
  hasClients: boolean
  hasApiKeyOrWebhook: boolean
  hasCallData: boolean
  isComplete: boolean
}

export interface ClientOnCallStatus {
  contactName: string | null
  contactPhone: string | null
  contactRole: string | null
  shiftName: string | null
}

// ─── Client management ───────────────────────────────────────────────────────

/**
 * Creates a new business (client) record for the given operator.
 * Returns the new business ID.
 */
export async function createClientBusiness(
  operatorOrgId: string,
  name: string
): Promise<string> {
  const supabase = await createClient()
  const { data: biz, error } = await supabase
    .from('businesses')
    .insert({
      name,
      enabled_modules: ['answering_service'],
      operator_org_id: operatorOrgId,
    })
    .select('id')
    .single()

  if (error || !biz) {
    throw new Error(`Failed to create business: ${error?.message ?? 'unknown error'}`)
  }

  return (biz as { id: string }).id
}

/**
 * Links a user to a business with the given role.
 * Requires service role — users_businesses has no INSERT policy for operator sessions.
 */
export async function linkUserToBusiness(
  userId: string,
  businessId: string,
  role: 'owner' | 'admin' | 'member'
): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('users_businesses').insert({
    user_id: userId,
    business_id: businessId,
    role,
  })

  if (error) {
    throw new Error(`Failed to link user to business: ${error.message}`)
  }
}

// ─── Operator org settings ──────────────────���────────────────────────────────

export interface BrandingUpdates {
  name?: string | null
  color?: string | null
  logoUrl?: string | null
  supportEmail?: string | null
  customDomain?: string | null
}

/**
 * Merge-patches operator org branding and settings.
 * Reads current values, applies only the provided fields, writes back.
 */
export async function updateOperatorBranding(
  operatorOrgId: string,
  updates: BrandingUpdates
): Promise<void> {
  const supabase = await createClient()
  const { data: current, error: fetchError } = await supabase
    .from('operator_orgs')
    .select('branding, settings')
    .eq('id', operatorOrgId)
    .single()

  if (fetchError) throw new Error('Failed to load current settings.')

  const currentBranding = (current?.branding ?? {}) as Record<string, unknown>
  const currentSettings = (current?.settings ?? {}) as Record<string, unknown>

  const newBranding = {
    ...currentBranding,
    ...(updates.color !== null && updates.color !== undefined ? { primary_color: updates.color } : {}),
    ...(updates.logoUrl !== null && updates.logoUrl !== undefined ? { logo_url: updates.logoUrl || null } : {}),
    ...(updates.customDomain !== null && updates.customDomain !== undefined ? { custom_domain: updates.customDomain || null } : {}),
  }

  const newSettings = {
    ...currentSettings,
    ...(updates.supportEmail !== null && updates.supportEmail !== undefined ? { support_email: updates.supportEmail || null } : {}),
  }

  const updateData: Record<string, unknown> = { branding: newBranding, settings: newSettings }
  if (updates.name) updateData.name = updates.name

  const { error: updateError } = await supabase
    .from('operator_orgs')
    .update(updateData)
    .eq('id', operatorOrgId)

  if (updateError) throw new Error(`Failed to save: ${updateError.message}`)
}

/**
 * Saves integration config into operator_orgs.settings.integration_config.
 * Reads current settings, replaces integration_config, writes back.
 */
export async function saveIntegrationConfig(
  operatorOrgId: string,
  integrationConfig: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()
  const { data: currentOrg, error: fetchError } = await supabase
    .from('operator_orgs')
    .select('settings')
    .eq('id', operatorOrgId)
    .single()

  if (fetchError) throw new Error('Failed to load current settings.')

  const currentSettings = isRecord(currentOrg?.settings) ? (currentOrg.settings as Record<string, unknown>) : {}

  const { error: updateError } = await supabase
    .from('operator_orgs')
    .update({ settings: { ...currentSettings, integration_config: integrationConfig } })
    .eq('id', operatorOrgId)

  if (updateError) throw new Error(`Failed to save: ${updateError.message}`)
}

// ─── Operator setup status ──────────────���───────────────────────────��────────

export async function getOperatorSetupStatus(
  operatorOrgId: string
): Promise<OperatorSetupStatus> {
  const supabase = await createClient()

  const [
    orgResult,
    templateResult,
    clientResult,
    apiKeyResult,
    webhookResult,
    businessForCallsResult,
  ] = await Promise.all([
    supabase
      .from('operator_orgs')
      .select('branding')
      .eq('id', operatorOrgId)
      .maybeSingle(),
    supabase
      .from('billing_rule_templates')
      .select('id')
      .eq('operator_org_id', operatorOrgId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('businesses')
      .select('id')
      .eq('operator_org_id', operatorOrgId)
      .is('churned_at', null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('api_keys')
      .select('id')
      .eq('operator_org_id', operatorOrgId)
      .is('revoked_at', null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('webhook_subscriptions')
      .select('id')
      .eq('operator_org_id', operatorOrgId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('businesses')
      .select('id')
      .eq('operator_org_id', operatorOrgId)
      .limit(50),
  ])

  // Log but don't throw — setup status is a non-critical checklist feature.
  if (orgResult.error) logger.warn('getOperatorSetupStatus: orgResult error', { error: orgResult.error.message })
  if (templateResult.error) logger.warn('getOperatorSetupStatus: templateResult error', { error: templateResult.error.message })
  if (clientResult.error) logger.warn('getOperatorSetupStatus: clientResult error', { error: clientResult.error.message })
  if (apiKeyResult.error) logger.warn('getOperatorSetupStatus: apiKeyResult error', { error: apiKeyResult.error.message })
  if (webhookResult.error) logger.warn('getOperatorSetupStatus: webhookResult error', { error: webhookResult.error.message })
  if (businessForCallsResult.error) logger.warn('getOperatorSetupStatus: businessForCallsResult error', { error: businessForCallsResult.error.message })

  const branding = (orgResult.data as { branding?: { logo_url?: string | null; primary_color?: string | null } | null } | null)?.branding
  const logoUrl = branding?.logo_url?.trim() ?? ''
  const primaryColor = branding?.primary_color?.trim() ?? ''
  const hasBranding = Boolean(logoUrl) || (primaryColor !== '' && primaryColor !== '#334155')

  const businessIds = ((businessForCallsResult.data ?? []) as Array<{ id: string }>).map(
    (business) => business.id
  )

  let hasCallData = false
  if (businessIds.length > 0) {
    const { data: callLog, error: callError } = await supabase
      .from('call_logs')
      .select('id')
      .in('business_id', businessIds)
      .limit(1)
      .maybeSingle()

    if (callError) logger.warn('getOperatorSetupStatus: callError', { error: callError.message })
    hasCallData = Boolean(callLog?.id)
  }

  const hasTemplate = Boolean(templateResult.data?.id)
  const hasClients = Boolean(clientResult.data?.id)
  const hasApiKeyOrWebhook = Boolean(apiKeyResult.data?.id || webhookResult.data?.id)
  const isComplete =
    hasBranding &&
    hasTemplate &&
    hasClients &&
    hasApiKeyOrWebhook &&
    hasCallData

  return {
    hasBranding,
    hasTemplate,
    hasClients,
    hasApiKeyOrWebhook,
    hasCallData,
    isComplete,
  }
}

// ─── On-call status ───────────────��──────────────────────────────────────────

export async function getClientOnCallStatus(
  businessId: string,
  operatorOrgId: string
): Promise<ClientOnCallStatus> {
  // Verify the business belongs to this operator's org before reading on-call data
  const supabase = createServiceRoleClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('operator_org_id', operatorOrgId)
    .maybeSingle()

  if (!business) {
    return { contactName: null, contactPhone: null, contactRole: null, shiftName: null }
  }

  const rawTimezone = await getBusinessTimezone(businessId)
  if (!rawTimezone) {
    logger.warn('getClientOnCallStatus: no timezone configured, falling back to UTC', { businessId })
  }
  const timezone = rawTimezone ?? 'UTC'
  const { shifts, contacts } = await loadSchedulerData(businessId)
  const resolved = resolveActiveShift(new Date(), timezone, shifts, contacts)

  if (!resolved || resolved.escalationSteps.length === 0) {
    return { contactName: null, contactPhone: null, contactRole: null, shiftName: null }
  }

  const first = resolved.escalationSteps[0]
  return {
    contactName: first.name,
    contactPhone: first.phone,
    contactRole: first.role,
    shiftName: resolved.shiftName,
  }
}

// ─── Utilities ─────────────��─────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
