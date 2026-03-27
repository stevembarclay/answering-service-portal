import { redirect } from 'next/navigation'
import { getBusinessContext, getUser } from '@/lib/auth/server'
import { PageHeader } from '@/components/ui/page-header'
import { signOutAction } from '@/lib/auth/actions'
import { getStatusesForBusiness } from '@/lib/services/answering-service/messageStatusService'
import { MessageStatusesManager } from '@/components/answering-service/MessageStatusesManager'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const context = await getBusinessContext()
  if (!context) {
    redirect('/login')
  }

  const [user, statuses] = await Promise.all([
    getUser(),
    getStatusesForBusiness(context.businessId),
  ])

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Settings"
        subtitle="Account settings and notification preferences"
      />
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* Account card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Account</span>
        </div>
        <div className="flex items-center justify-between p-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-foreground">
              {user?.email ?? 'Signed in'}
            </span>
            <span className="text-xs text-muted-foreground">Your account email</span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Notifications card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
        </div>
        <div className="p-5">
          <p className="text-[13px] text-muted-foreground">
            Email alerts for high-priority messages — coming soon.
          </p>
        </div>
      </div>

      {/* Message Statuses */}
      <MessageStatusesManager initialStatuses={statuses} />
      </div>
      </div>
    </div>
  )
}
