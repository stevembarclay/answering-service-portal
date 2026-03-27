import { checkOperatorAccessOrThrow, getUser } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { OperatorNav } from '@/components/operator/OperatorNav'
import { OperatorBottomNav } from '@/components/operator/OperatorBottomNav'

interface OrgBranding {
  logo_url?: string | null
}

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const context = await checkOperatorAccessOrThrow()
  const [user, supabase] = await Promise.all([getUser(), createClient()])

  const { data: org } = await supabase
    .from('operator_orgs')
    .select('name, branding')
    .eq('id', context.operatorOrgId)
    .single()

  const orgName = (org?.name as string | null) ?? null
  const orgBranding = (org?.branding as OrgBranding | null) ?? null
  const logoUrl = orgBranding?.logo_url ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <OperatorNav
        userEmail={user?.email}
        orgName={orgName}
        logoUrl={logoUrl}
      />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      <OperatorBottomNav />
    </div>
  )
}
