import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'
import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import {
  getClientsWithHealthScores,
  getOperatorSetupStatus,
} from '@/lib/services/operator/operatorService'
import { ClientTable } from '@/components/operator/ClientTable'

interface ClientsPageProps {
  searchParams?: Promise<{ page?: string }>
}

const CLIENTS_PER_PAGE = 50

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const context = await checkOperatorAccessOrThrow()
  const resolvedSearchParams = (await searchParams) ?? {}
  const pageParam = Number.parseInt(resolvedSearchParams.page ?? '1', 10)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
  const [{ clients, total }, setupStatus] = await Promise.all([
    getClientsWithHealthScores(context.operatorOrgId, page, CLIENTS_PER_PAGE),
    getOperatorSetupStatus(context.operatorOrgId),
  ])
  const completedCount = [
    setupStatus.hasBranding,
    setupStatus.hasTemplate,
    setupStatus.hasClients,
    setupStatus.hasApiKeyOrWebhook,
    setupStatus.hasCallData,
  ].filter(Boolean).length

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-8">
        <h1 className="text-xl font-bold text-foreground">Clients</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/operator/clients/import"
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-[13px] font-medium text-foreground hover:bg-muted"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Link>
          <Link
            href="/operator/clients/new"
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Client
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {!setupStatus.isComplete ? (
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 md:mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-sm font-semibold text-foreground">Complete your setup</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {completedCount} of 5 steps done
                </span>
              </div>
              <Link href="/operator/setup" className="text-sm font-medium text-primary hover:underline">
                Continue →
              </Link>
            </div>
          </div>
        ) : null}

        <ClientTable clients={clients} />

        {total > CLIENTS_PER_PAGE ? (
          <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
            <span>
              Showing {Math.min(page * CLIENTS_PER_PAGE, total)} of {total} clients
            </span>
            <div className="flex gap-2">
              {page > 1 ? <Link href={`?page=${page - 1}`}>← Previous</Link> : null}
              {page * CLIENTS_PER_PAGE < total ? <Link href={`?page=${page + 1}`}>Next →</Link> : null}
            </div>
          </div>
        ) : null}

        {clients.length === 0 ? (
          <div className="mt-6 rounded-xl border border-border bg-card p-8 text-center">
            <h3 className="text-base font-semibold text-foreground">No clients yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first client or import them from a CSV.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/operator/clients/new" className="text-sm font-medium text-primary hover:underline">
                Add Client
              </Link>
              <Link href="/operator/clients/import" className="text-sm font-medium text-primary hover:underline">
                Import CSV
              </Link>
              <Link href="/operator/setup" className="text-sm font-medium text-primary hover:underline">
                Setup Guide
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
