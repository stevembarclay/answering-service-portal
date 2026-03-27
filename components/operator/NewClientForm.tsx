'use client'

import { useActionState } from 'react'
import { createClientAction, type NewClientFormState } from '@/app/(operator)/operator/clients/new/actions'

export function NewClientForm({ templates: _templates }: { templates: { id: string; name: string }[] }) {
  const [state, action, isPending] = useActionState<NewClientFormState, FormData>(
    createClientAction,
    null
  )

  return (
    <form action={action} className="space-y-5">
      {/* Business name */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-[13px] font-medium text-foreground">
          Business name <span className="text-rose-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Riverside Law Group"
          className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Contact email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-[13px] font-medium text-foreground">
          Contact email <span className="text-rose-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="owner@example.com"
          className="h-9 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Error */}
      {state?.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-800 dark:bg-rose-950/30">
          <p className="text-[13px] text-rose-700 dark:text-rose-300">{state.error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="flex h-9 w-full items-center justify-center rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-opacity disabled:opacity-60"
      >
        {isPending ? 'Creating…' : 'Add Client & Send Invite'}
      </button>
    </form>
  )
}
