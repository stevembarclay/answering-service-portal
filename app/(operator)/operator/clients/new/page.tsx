import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import { NewClientForm } from '@/components/operator/NewClientForm'

export default async function NewClientPage() {
  await checkOperatorAccessOrThrow()

  return (
    <div className="flex h-full flex-col">
      {/* Top bar with breadcrumb */}
      <div className="flex h-16 shrink-0 items-center border-b border-border bg-card px-8">
        <div className="flex items-center gap-1.5">
          <Link
            href="/operator/clients"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clients
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">New Client</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto mt-8 max-w-lg">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex h-[52px] items-center border-b border-border px-5">
              <span className="text-sm font-semibold text-foreground">Provision a new client</span>
            </div>
            <div className="px-5 py-1 border-b border-border">
              <p className="py-3 text-[13px] text-muted-foreground">
                They&apos;ll receive a magic link to activate their portal.
              </p>
            </div>
            <div className="px-5 py-5">
              <NewClientForm templates={[]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
