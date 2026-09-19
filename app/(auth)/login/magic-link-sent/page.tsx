import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { portalConfig } from '@/lib/config/portal'

interface MagicLinkSentPageProps {
  searchParams: Promise<{ email?: string }>
}

export default async function MagicLinkSentPage({ searchParams }: MagicLinkSentPageProps) {
  const params = await searchParams
  const email = params.email

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex w-[480px] flex-col gap-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[15px] font-bold text-white"
            style={{ backgroundColor: 'var(--portal-brand-color, #334155)' }}
          >
            {portalConfig.name.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-2xl font-bold text-foreground">{portalConfig.name}</span>
        </div>

        {/* Card */}
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0fdf4]">
            <MailCheck className="h-7 w-7 text-success" />
          </div>

          {/* Content */}
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-bold text-foreground">Check your email</h1>
            <p className="max-w-[380px] text-sm text-muted-foreground">
              We sent a sign-in link{email ? ` to ${email}` : ''}. Click the link to sign in instantly.
            </p>
          </div>

          {/* Open email */}
          <a
            href="mailto:"
            className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open email app
          </a>

          <p className="text-[13px] text-muted-foreground">
            Didn&apos;t receive it?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Resend link
            </Link>
          </p>

          <Link href="/login" className="text-[13px] text-primary hover:underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
