import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getBusinessContext, getUser } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { portalConfig } from '@/lib/config/portal'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import { getUnreadMessageCount } from '@/lib/services/answering-service/dashboardService'
import { BottomNav } from '@/components/answering-service/BottomNav'
import { SideNav } from '@/components/answering-service/SideNav'
import { PwaInstallBanner } from '@/components/answering-service/PwaInstallBanner'
import { Toaster } from '@/components/ui/sonner'
import { UnreadMessagesProvider } from '@/lib/context/unread-messages-context'
import type React from 'react'

interface OperatorBranding {
  primary_color?: string | null
  logo_url?: string | null
}

export default async function AnsweringServiceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const context = await getBusinessContext()

  if (!context) {
    redirect('/login')
  }

  await checkModuleAccessOrThrow('answering_service')

  const supabase = await createClient()

  const [unreadCount, user] = await Promise.all([
    getUnreadMessageCount(context.businessId),
    getUser(),
  ])

  // Resolve operator branding for this business
  let operatorBranding: OperatorBranding | null = null
  let operatorName: string | null = null

  const { data: business } = await supabase
    .from('businesses')
    .select('operator_org_id, hipaa_mode')
    .eq('id', context.businessId)
    .single()

  // Determine the operator org ID — from business row or custom domain header
  const requestHeaders = await headers()
  const headerOrgId = requestHeaders.get('x-operator-org-id')
  const resolvedOrgId = (business?.operator_org_id as string | null) ?? headerOrgId
  const hipaaMode =
    (business as { operator_org_id?: string | null; hipaa_mode?: boolean } | null)?.hipaa_mode ?? false

  if (resolvedOrgId) {
    const { data: org } = await supabase
      .from('operator_orgs')
      .select('name, branding')
      .eq('id', resolvedOrgId)
      .single()

    if (org) {
      operatorName = (org.name as string | null) ?? null
      operatorBranding = (org.branding as OperatorBranding | null) ?? null
    }
  }

  const brandName = operatorName ?? portalConfig.name
  const primaryColor = operatorBranding?.primary_color
  const logoUrl = operatorBranding?.logo_url

  return (
    <UnreadMessagesProvider initialHasUnread={unreadCount > 0}>
      <div
        className="flex h-screen overflow-hidden bg-background"
        style={
          primaryColor
            ? ({ '--color-primary': primaryColor } as React.CSSProperties)
            : undefined
        }
      >
        <SideNav
          brandName={brandName}
          userEmail={user?.email}
          logoUrl={logoUrl}
          hipaaMode={hipaaMode}
        />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
        <BottomNav hasUnreadMessages={unreadCount > 0} />
        <PwaInstallBanner />
        <Toaster />
      </div>
    </UnreadMessagesProvider>
  )
}
