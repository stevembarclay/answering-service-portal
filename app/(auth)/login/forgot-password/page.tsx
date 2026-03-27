'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { sendPasswordResetEmail } from '@/app/(auth)/login/actions'
import { portalConfig } from '@/lib/config/portal'

const inputClasses =
  'w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams()
  const sent = searchParams.get('sent') === 'true'
  const error = searchParams.get('error')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      void sendPasswordResetEmail(formData)
    })
  }

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
        <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
          {sent ? (
            <div className="flex flex-col gap-3 text-center">
              <h1 className="text-xl font-bold text-foreground">Reset link sent</h1>
              <p className="text-sm text-muted-foreground">
                If that email belongs to an account, a reset link is on its way now.
              </p>
              <Link href="/login" className="text-[13px] text-primary hover:underline">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <form action={handleSubmit} className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-foreground">Reset your password</h1>
                <p className="text-[13px] text-muted-foreground">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {/* Email field */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[13px] font-semibold text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  disabled={isPending}
                  placeholder="you@example.com"
                  className={inputClasses}
                  aria-invalid={Boolean(error)}
                />
              </div>

              {error ? (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
                  {error}
                </p>
              ) : null}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Sending…' : 'Send reset link'}
              </button>

              {/* Back */}
              <div className="flex justify-center">
                <Link href="/login" className="text-[13px] text-muted-foreground hover:text-foreground">
                  ← Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
