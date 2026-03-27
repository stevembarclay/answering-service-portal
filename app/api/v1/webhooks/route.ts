import { randomBytes } from 'crypto'

import { NextRequest, NextResponse } from 'next/server'

import { validateBearerToken } from '@/lib/api/bearerAuth'
import { createClient } from '@/lib/supabase/server'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'

export async function GET(request: NextRequest) {
  const auth = await validateBearerToken(
    request.headers.get('authorization'),
    'webhooks:read',
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
  )
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.message, code: 'UNAUTHORIZED' } }, { status: auth.status })
  }
  if (!auth.operatorOrgId) {
    return NextResponse.json({ error: { message: 'Webhooks are operator-level only.', code: 'FORBIDDEN' } }, { status: 403 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .select('id, operator_org_id, url, topics, status, consecutive_failure_count, created_at, updated_at')
      .eq('operator_org_id', auth.operatorOrgId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await validateBearerToken(
    request.headers.get('authorization'),
    'webhooks:write',
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
  )
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.message, code: 'UNAUTHORIZED' } }, { status: auth.status })
  }
  if (!auth.operatorOrgId) {
    return NextResponse.json({ error: { message: 'Webhooks are operator-level only.', code: 'FORBIDDEN' } }, { status: 403 })
  }

  try {
    const body = await request.json() as { url?: string; topics?: string[] }
    if (!body.url || !Array.isArray(body.topics) || body.topics.length === 0) {
      return NextResponse.json({ error: { message: 'url and topics are required.', code: 'BAD_REQUEST' } }, { status: 400 })
    }

    const secret = randomBytes(32).toString('hex')
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .insert({
        operator_org_id: auth.operatorOrgId,
        url: body.url,
        secret,
        topics: body.topics,
        status: 'active',
      })
      .select('id, url, topics, status, created_at')
      .single()

    if (error || !data) {
      throw new Error('Failed to create webhook subscription.')
    }

    return NextResponse.json({ data: { ...(data as object), secret } }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
