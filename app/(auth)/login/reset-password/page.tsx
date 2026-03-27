'use client'

import { useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { resetPassword } from '@/app/(auth)/login/actions'
import { portalConfig } from '@/lib/config/portal'

const inputClasses =
  'w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      void resetPassword(formData)
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
          <form action={handleSubmit} className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-foreground">Set new password</h1>
              <p className="text-[13px] text-muted-foreground">
                Choose a strong password for your account.
              </p>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-[13px] font-semibold text-foreground">
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={isPending}
                  className={inputClasses}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirm" className="text-[13px] font-semibold text-foreground">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={isPending}
                  className={inputClasses}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'reset-error' : undefined}
                />
              </div>
            </div>

            <p className="text-[12px] text-muted-foreground">
              Must be at least 8 characters with one number and one special character.
            </p>

            {error ? (
              <p
                id="reset-error"
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700"
              >
                {error}
              </p>
            ) : null}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
