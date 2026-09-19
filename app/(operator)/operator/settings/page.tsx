import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import { IntegrationConfigForm } from '@/components/operator/IntegrationConfigForm'
import { PageHeader } from '@/components/ui/page-header'
import { createClient } from '@/lib/supabase/server'
import { SettingsBrandingForm } from '@/components/operator/SettingsBrandingForm'
import type { IntegrationConfig } from '@/lib/integrations/types'

interface OrgBranding {
  primary_color?: string | null
  logo_url?: string | null
  secondary_color?: string | null
  custom_domain?: string | null
}

interface OrgSettings {
  support_email?: string | null
  integration_config?: IntegrationConfig | null
}

interface OrgRow {
  name?: string | null
  slug?: string | null
  branding?: OrgBranding | null
  settings?: OrgSettings | null
}

export default async function SettingsPage() {
  const context = await checkOperatorAccessOrThrow()
  const supabase = await createClient()

  const { data: org } = await supabase
    .from('operator_orgs')
    .select('id, name, slug, branding, settings')
    .eq('id', context.operatorOrgId)
    .single()

  const orgData = org as OrgRow | null

  const initialName = orgData?.name ?? ''
  const initialColor = orgData?.branding?.primary_color ?? '#334155'
  const initialLogoUrl = orgData?.branding?.logo_url ?? ''
  const initialSupportEmail = orgData?.settings?.support_email ?? ''
  const initialCustomDomain = orgData?.branding?.custom_domain ?? ''
  const integrationConfig = orgData?.settings?.integration_config ?? null
  const initialPlatform = integrationConfig?.startel
    ? 'startel'
    : integrationConfig?.amtelco
      ? 'amtelco'
      : 'none'

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Operator Settings"
        subtitle="Branding, domain, and integration credentials"
      />
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* Portal config card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Portal Configuration</span>
        </div>

        {/* Slug row — read-only */}
        <div className="flex h-14 items-center justify-between border-b border-border px-5">
          <span className="text-[13px] text-muted-foreground">Slug</span>
          <div className="flex h-9 items-center rounded-lg bg-muted px-3">
            <span className="font-mono text-[13px] text-foreground">{orgData?.slug ?? '—'}</span>
          </div>
        </div>

        {/* Editable branding fields */}
        <SettingsBrandingForm
          initialName={initialName}
          initialColor={initialColor}
          initialLogoUrl={initialLogoUrl}
          initialSupportEmail={initialSupportEmail}
          initialCustomDomain={initialCustomDomain}
        />
      </div>

      <div id="integration-source" className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Integration Source</span>
        </div>
        <IntegrationConfigForm
          initialPlatform={initialPlatform}
          initialStarTelBaseUrl={integrationConfig?.startel?.base_url ?? ''}
          initialAmtelcoBaseUrl={integrationConfig?.amtelco?.base_url ?? ''}
          initialAmtelcoUsername={integrationConfig?.amtelco?.username ?? ''}
          initialFreshnessHours={integrationConfig?.data_freshness_alert_hours ?? 24}
          initialStarTelApiKeyMasked={maskSecret(integrationConfig?.startel?.api_key)}
          initialAmtelcoPasswordMasked={maskSecret(integrationConfig?.amtelco?.password)}
        />
      </div>
      </div>
      </div>
    </div>
  )
}

function maskSecret(secret: string | undefined): string | null {
  if (!secret) {
    return null
  }

  const suffix = secret.slice(-4)
  return `••••${suffix}`
}
