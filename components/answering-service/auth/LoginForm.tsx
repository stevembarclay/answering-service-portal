'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Mail, Lock, Zap } from 'lucide-react'
import { signInWithPassword, sendMagicLink } from '@/app/(auth)/login/actions'

interface LoginFormProps {
  error?: string
  next?: string
}

const inputClasses =
  'w-full h-11 rounded-[10px] border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export function LoginForm({ error, next }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isMagicPending, startMagicTransition] = useTransition()

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('email', email)
    formData.set('password', password)
    formData.set('next', next ?? '/answering-service')
    startTransition(() => {
      void signInWithPassword(formData)
    })
  }

  function handleMagicLink() {
    const formData = new FormData()
    formData.set('email', email)
    startMagicTransition(() => {
      void sendMagicLink(formData)
    })
  }

  const busy = isPending || isMagicPending

  return (
    <form onSubmit={handleSignIn} className="flex flex-col gap-6">
      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[13px] font-semibold text-foreground">
          Email address
        </label>
        <div className="relative flex items-center">
          <Mail className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={busy}
            placeholder="you@example.com"
            className={inputClasses}
            aria-invalid={Boolean(error)}
          />
        </div>
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-[13px] font-semibold text-foreground">
            Password
          </label>
          <Link
            href="/login/forgot-password"
            className="text-[13px] text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative flex items-center">
          <Lock className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={busy}
            placeholder="••••••••"
            className={inputClasses}
            aria-invalid={Boolean(error)}
          />
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700"
        >
          {error}
        </p>
      ) : null}

      {/* Sign in button */}
      <button
        type="submit"
        disabled={busy}
        className="flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>

      {/* Or divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[13px] text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Magic link button */}
      <button
        type="button"
        onClick={handleMagicLink}
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[14px] font-semibold text-foreground transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Zap className="h-4 w-4" />
        {isMagicPending ? 'Sending…' : 'Send me a magic link'}
      </button>
    </form>
  )
}
