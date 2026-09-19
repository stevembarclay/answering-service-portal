'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function normalizeNext(rawNext: string | null): string {
  return rawNext && rawNext.startsWith('/') ? rawNext : '/answering-service'
}

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = normalizeNext(String(formData.get('next') ?? '/answering-service'))

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent('Email and password are required')}`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent('Invalid email or password')}`)
  }

  const { data: operatorRow } = await supabase
    .from('operator_users')
    .select('operator_org_id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  redirect(operatorRow ? '/operator/clients' : next)
}

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    redirect(`/login?error=${encodeURIComponent('Email is required')}`)
  }

  const supabase = await createClient()
  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback?next=/answering-service`,
      shouldCreateUser: false,
    },
  })

  redirect(`/login/magic-link-sent?email=${encodeURIComponent(email)}`)
}

export async function sendPasswordResetEmail(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    redirect(`/login/forgot-password?error=${encodeURIComponent('Email is required')}`)
  }

  const supabase = await createClient()
  await Promise.all([
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback?next=/login/reset-password`,
    }),
    new Promise((resolve) => setTimeout(resolve, 300)),
  ])

  redirect('/login/forgot-password?sent=true')
}

export async function resetPassword(formData: FormData) {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (!password || password.length < 8) {
    redirect(
      `/login/reset-password?error=${encodeURIComponent('Password must be at least 8 characters')}`
    )
  }

  if (password !== confirm) {
    redirect(`/login/reset-password?error=${encodeURIComponent('Passwords do not match')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(
      `/login/reset-password?error=${encodeURIComponent(
        'Could not update password. Try requesting a new reset link.'
      )}`
    )
  }

  redirect('/answering-service')
}
