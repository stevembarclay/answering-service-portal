'use client'

import { useTransition } from 'react'
import { sendMagicLink } from '@/app/(auth)/login/actions'
import { focusStyles, hoverTransitions, touchTarget } from '@/lib/design/motion-system'
import { bodyStyles } from '@/lib/design/typography-system'

interface MagicLinkButtonProps {
  email?: string
}

export function MagicLinkButton({ email }: MagicLinkButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      void sendMagicLink(formData)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      {email ? <input type="hidden" name="email" value={email} /> : null}
      {!email ? (
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          placeholder="you@example.com"
        />
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className={`${touchTarget} ${hoverTransitions.button} ${focusStyles.primary} w-full rounded-lg border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isPending ? 'Sending...' : 'Email me a sign-in link'}
      </button>
      <p className={`${bodyStyles.caption} text-center text-slate-500`}>
        We will always show the same confirmation screen to protect account privacy.
      </p>
    </form>
  )
}
