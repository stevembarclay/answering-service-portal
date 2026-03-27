import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { ClientDetailTabs } from '@/components/operator/ClientDetailTabs'
import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import { getClientDetail, getClientOnCallStatus } from '@/lib/services/operator/operatorService'
import { resendInviteAction } from './actions'

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ inviteEmail?: string }>
}) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const context = await checkOperatorAccessOrThrow()

  const [client, onCallStatus] = await Promise.all([
    getClientDetail(id, context.operatorOrgId),
    getClientOnCallStatus(id, context.operatorOrgId),
  ])

  if (!client) notFound()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-border bg-card px-4 md:px-8">
        <div className="flex items-center gap-1.5">
          <Link
            href="/operator/clients"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clients
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{client.name}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <ClientDetailTabs
          client={client}
          onCallStatus={onCallStatus}
          resendInviteAction={resendInviteAction}
          inviteWarning={
            resolvedSearchParams?.inviteEmail === 'not-sent'
              ? 'Client created, but the invite email was not sent. Configure RESEND_API_KEY to enable branded emails, then resend the invite from this page.'
              : undefined
          }
        />
      </div>
    </div>
  )
}
