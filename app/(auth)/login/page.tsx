import { Mail, Phone, Receipt } from 'lucide-react'
import { portalConfig } from '@/lib/config/portal'
import { LoginForm } from '@/components/answering-service/auth/LoginForm'

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex w-[600px] shrink-0 flex-col justify-between bg-[#0f172a] p-16">
        <div className="flex flex-col gap-12">
          {/* Brand */}
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: 'var(--portal-brand-color, #334155)' }}
            >
              {portalConfig.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-lg font-bold text-white">{portalConfig.name}</span>
          </div>

          {/* Headline */}
          <div className="flex flex-col gap-5">
            <h1 className="font-[family-name:var(--font-heading)] italic text-[50px] leading-[1.06] tracking-tight text-white">
              Your calls,
              <br />
              handled professionally.
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-400">
              Review messages, manage on-call schedules, and track billing — all in one place.
            </p>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="text-sm text-slate-400">Priority message alerts with caller transcripts</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="text-sm text-slate-400">On-call scheduling with automated routing</span>
            </div>
            <div className="flex items-center gap-3">
              <Receipt className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="text-sm text-slate-400">Transparent per-call billing with monthly invoices</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600">No public sign-up · Invite-only access</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-[#f8fafc] px-6 py-10">
        <div className="flex w-full max-w-[460px] flex-col gap-8">
          {/* Form card */}
          <div className="rounded-2xl border border-border bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.05)] sm:p-10">
            <div className="mb-6 flex flex-col gap-2">
              <h2 className="font-[family-name:var(--font-heading)] text-[30px] font-semibold leading-tight tracking-tight text-foreground">Welcome back</h2>
              <p className="text-[15px] text-muted-foreground">Sign in to your account to continue.</p>
            </div>
            <LoginForm error={params.error} next={params.next} />
          </div>

          {/* Footer */}
          <p className="text-center text-[13px] text-muted-foreground">
            Need help? Contact support@example.com
          </p>
        </div>
      </div>
    </div>
  )
}
