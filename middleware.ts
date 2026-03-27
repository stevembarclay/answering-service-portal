// middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Create a mutable response for cookie updates (required by @supabase/ssr)
  let supabaseResponse = NextResponse.next({ request })

  // Explicit type forces TypeScript to the correct (non-deprecated) overload of
  // createServerClient, which in turn properly types the setAll parameter.
  const cookies: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll()
    },
    // Two separate loops are required — do NOT merge them.
    // Loop 1 mutates request.cookies. Then supabaseResponse is rebuilt once.
    // Loop 2 sets cookies on the new response object.
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) =>
        request.cookies.set(name, value)
      )
      supabaseResponse = NextResponse.next({ request })
      cookiesToSet.forEach(({ name, value, options }) =>
        // SAFETY: CookieOptions (Partial<SerializeOptions>) is structurally
        // compatible with Next.js ResponseCookieOptions at the fields we use.
        supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
      )
    },
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  )

  // Custom domain resolution: if this request is coming in on a non-primary
  // host, look up which operator org owns it and attach as a request header
  // for use in layouts.
  const host = request.headers.get('host') ?? ''
  const primaryHost = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
    : null

  let customDomainOrgId: string | null = null
  if (primaryHost && host !== primaryHost && !host.includes('localhost')) {
    const { data: orgRow } = await supabase
      .from('operator_orgs')
      .select('id')
      .eq('branding->>custom_domain', host)
      .maybeSingle()

    if (orgRow) {
      customDomainOrgId = orgRow.id as string
    }
  }

  // Inject custom domain org ID into request headers so Server Components
  // can read it via headers(). Must happen before getUser() which may
  // rebuild supabaseResponse via setAll.
  if (customDomainOrgId) {
    request.headers.set('x-operator-org-id', customDomainOrgId)
    supabaseResponse = NextResponse.next({ request })
  }

  // If a client lands on a custom domain root path, rewrite to the portal
  if (customDomainOrgId && pathname === '/') {
    return NextResponse.rewrite(new URL('/answering-service', request.url), {
      request: { headers: request.headers },
    })
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Authenticated user hitting a login page → send to the right portal
  if (user && pathname.startsWith('/login')) {
    const { data: opMembership } = await supabase
      .from('operator_users')
      .select('operator_org_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    const portalUrl = request.nextUrl.clone()
    portalUrl.pathname = opMembership ? '/operator/clients' : '/answering-service'
    return NextResponse.redirect(portalUrl)
  }

  // Unauthenticated user on a protected route → redirect to login
  if (!user && !pathname.startsWith('/login')) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Exclude: static assets, API routes (they guard themselves), image files, and PWA manifests
    '/((?!_next/static|_next/image|api/|favicon.ico|manifest\\.webmanifest$|.*\\.png$|.*\\.svg$|.*\\.ico$).*)',
  ],
}
