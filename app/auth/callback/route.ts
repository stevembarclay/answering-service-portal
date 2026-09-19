import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

interface CookieToSet {
  name: string
  value: string
  options?: Parameters<Awaited<ReturnType<typeof cookies>>['set']>[2]
}

const ALLOWED_NEXT_PATHS = new Set([
  '/answering-service',
  '/answering-service/messages',
  '/answering-service/dashboard',
  '/answering-service/billing',
  '/answering-service/settings',
  '/login/reset-password',
])

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/answering-service'
  const next = ALLOWED_NEXT_PATHS.has(rawNext) ? rawNext : '/answering-service'

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Invalid sign-in link')}`
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(
              name,
              value,
              options as Parameters<typeof cookieStore.set>[2]
            )
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Sign-in link expired or already used')}`
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
