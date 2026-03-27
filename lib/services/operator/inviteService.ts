import { Resend } from 'resend'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { createModuleLogger } from '@/lib/utils/logger'

const logger = createModuleLogger('operator/inviteService')
const DEFAULT_PRIMARY_COLOR = '#334155'

interface OperatorBrandingRow {
  name?: string | null
  branding?: {
    logo_url?: string | null
    primary_color?: string | null
  } | null
}

export interface InviteResult {
  userId: string
  emailSent: boolean
}

interface EmailTemplateOptions {
  actionLink: string
  headline: string
  body: string
  ctaLabel: string
  orgName: string
  logoUrl: string | null
  primaryColor: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildInviteEmailHtml(opts: EmailTemplateOptions): string {
  const safeOrgName = escapeHtml(opts.orgName)
  const safeHeadline = escapeHtml(opts.headline)
  const safeBody = escapeHtml(opts.body)
  const safeCtaLabel = escapeHtml(opts.ctaLabel)
  const safeActionLink = escapeHtml(opts.actionLink)
  const safePrimaryColor = escapeHtml(opts.primaryColor)
  const logoMarkup = opts.logoUrl
    ? `<img src="${escapeHtml(opts.logoUrl)}" alt="${safeOrgName}" style="max-height:56px;max-width:180px;display:block;margin:0 auto 16px;" />`
    : `<div style="font-size:24px;font-weight:700;line-height:1.2;color:#0f172a;text-align:center;margin-bottom:16px;">${safeOrgName}</div>`

  return `
    <div style="background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:40px 32px;text-align:center;">
        ${logoMarkup}
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;font-weight:700;color:#0f172a;">${safeHeadline}</h1>
        <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#475569;">${safeBody}</p>
        <a href="${safeActionLink}" style="display:inline-block;padding:14px 24px;background:${safePrimaryColor};border-radius:9999px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">${safeCtaLabel}</a>
        <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#64748b;">If you didn&apos;t expect this email, ignore it.</p>
      </div>
    </div>
  `
}

async function loadOperatorBranding(operatorOrgId: string): Promise<{
  orgName: string
  logoUrl: string | null
  primaryColor: string
}> {
  const serviceRole = createServiceRoleClient()
  const { data, error } = await serviceRole
    .from('operator_orgs')
    .select('name, branding')
    .eq('id', operatorOrgId)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Failed to load operator branding.')
  }

  // SAFETY: this query selects exactly the fields represented by OperatorBrandingRow.
  const org = data as OperatorBrandingRow
  return {
    orgName: org.name?.trim() || 'Your Operator Portal',
    logoUrl: org.branding?.logo_url?.trim() || null,
    primaryColor: org.branding?.primary_color?.trim() || DEFAULT_PRIMARY_COLOR,
  }
}

async function sendBrandedEmail(opts: {
  to: string
  subject: string
  actionLink: string
  orgName: string
  logoUrl: string | null
  primaryColor: string
  headline: string
  body: string
  ctaLabel: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    logger.warn(`RESEND_API_KEY not set — invite email not sent to ${opts.to}`)
    return false
  }

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL ?? 'noreply@stintwell.com'

  try {
    await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: buildInviteEmailHtml({
        actionLink: opts.actionLink,
        headline: opts.headline,
        body: opts.body,
        ctaLabel: opts.ctaLabel,
        orgName: opts.orgName,
        logoUrl: opts.logoUrl,
        primaryColor: opts.primaryColor,
      }),
    })
    return true
  } catch (error) {
    logger.error('Failed to send branded invite email via Resend', { error, email: opts.to })
    return false
  }
}

export async function sendInvite(opts: {
  email: string
  businessId: string
  operatorOrgId: string
  redirectTo?: string
}): Promise<InviteResult> {
  const serviceRole = createServiceRoleClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const redirectTo = opts.redirectTo ?? `${appUrl}/answering-service/setup`
  const branding = await loadOperatorBranding(opts.operatorOrgId)

  const { data, error } = await serviceRole.auth.admin.generateLink({
    type: 'invite',
    email: opts.email,
    options: {
      data: { business_id: opts.businessId },
      redirectTo,
    },
  })

  if (error) {
    throw error
  }

  const userId = data.user?.id
  const actionLink = data.properties?.action_link

  if (!userId || !actionLink) {
    throw new Error('Could not generate the invite link.')
  }

  const emailSent = await sendBrandedEmail({
    to: opts.email,
    subject: `You've been invited to ${branding.orgName}`,
    actionLink,
    orgName: branding.orgName,
    logoUrl: branding.logoUrl,
    primaryColor: branding.primaryColor,
    headline: `You've been invited to ${branding.orgName}`,
    body: 'Your answering service portal is ready. Set it up in 5 minutes.',
    ctaLabel: 'Activate Your Portal',
  })

  return { userId, emailSent }
}

export async function sendMagicLink(opts: {
  email: string
  operatorOrgId: string
  redirectTo?: string
}): Promise<{ emailSent: boolean }> {
  const serviceRole = createServiceRoleClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const redirectTo = opts.redirectTo ?? `${appUrl}/answering-service/setup`
  const branding = await loadOperatorBranding(opts.operatorOrgId)

  const { data, error } = await serviceRole.auth.admin.generateLink({
    type: 'magiclink',
    email: opts.email,
    options: { redirectTo },
  })

  if (error) {
    throw error
  }

  const actionLink = data.properties?.action_link
  if (!actionLink) {
    throw new Error('Could not generate the sign-in link.')
  }

  const emailSent = await sendBrandedEmail({
    to: opts.email,
    subject: `Access your ${branding.orgName} portal`,
    actionLink,
    orgName: branding.orgName,
    logoUrl: branding.logoUrl,
    primaryColor: branding.primaryColor,
    headline: `You've been invited to ${branding.orgName}`,
    body: 'Your answering service portal is ready. Set it up in 5 minutes.',
    ctaLabel: 'Activate Your Portal',
  })

  return { emailSent }
}
