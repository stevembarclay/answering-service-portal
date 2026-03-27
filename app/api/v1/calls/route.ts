import { NextRequest, NextResponse } from 'next/server'

import { validateBearerToken } from '@/lib/api/bearerAuth'
import { getOperatorContext } from '@/lib/auth/server'
import { ingestCalls, parseCsvCallRows, type RawCallInput } from '@/lib/services/operator/callIngestService'
import { createClient } from '@/lib/supabase/server'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateBearerToken(
      request.headers.get('authorization'),
      'calls:read',
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
    )
    if (!auth.valid) {
      return NextResponse.json({ error: { message: auth.message, code: 'UNAUTHORIZED' } }, { status: auth.status })
    }

    const url = new URL(request.url)
    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? '25', 10)))
    const offset = (page - 1) * limit

    if (auth.operatorOrgId && !url.searchParams.get('business_id')) {
      return NextResponse.json(
        { error: { message: 'business_id query parameter is required for operator keys.', code: 'BAD_REQUEST' } },
        { status: 400 }
      )
    }

    const businessId = auth.businessId ?? url.searchParams.get('business_id')
    if (!businessId) {
      return NextResponse.json({ error: { message: 'Business not found.', code: 'NOT_FOUND' } }, { status: 404 })
    }

    const supabase = await createClient()

    if (auth.operatorOrgId) {
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .eq('operator_org_id', auth.operatorOrgId)
        .maybeSingle()

      if (!business) {
        return NextResponse.json(
          { error: { message: 'Business not found or not in your org.', code: 'NOT_FOUND' } },
          { status: 404 }
        )
      }
    }

    const { data, count, error } = await supabase
      .from('call_logs')
      .select(
        'id, business_id, timestamp, call_type, direction, duration_seconds, telephony_status, message, priority, portal_status',
        { count: 'exact' }
      )
      .eq('business_id', businessId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return NextResponse.json({
      data,
      meta: { page, limit, total: count ?? 0 },
    })
  } catch (error) {
    logger.error('GET /api/v1/calls failed', { error })
    return NextResponse.json({ error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let operatorOrgId: string
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const auth = await validateBearerToken(authHeader, 'calls:write', clientIp)
    if (!auth.valid) {
      return NextResponse.json({ error: { message: auth.message, code: 'UNAUTHORIZED' } }, { status: auth.status })
    }
    if (!auth.operatorOrgId) {
      return NextResponse.json(
        { error: { message: 'calls:write requires an operator-scoped API key.', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }
    operatorOrgId = auth.operatorOrgId
  } else {
    const context = await getOperatorContext()
    if (!context) {
      return NextResponse.json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }, { status: 401 })
    }
    if (context.role !== 'admin') {
      return NextResponse.json({ error: { message: 'Forbidden: admin role required', code: 'FORBIDDEN' } }, { status: 403 })
    }
    operatorOrgId = context.operatorOrgId
  }

  try {
    const supabase = await createClient()
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('operator_org_id', operatorOrgId)
    const allowedIds = (businesses ?? []).map((b) => (b as { id: string }).id)

    let rows: RawCallInput[]
    let source: 'api' | 'csv' = 'api'
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      source = 'csv'
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return NextResponse.json({ error: { message: 'Missing file field', code: 'BAD_REQUEST' } }, { status: 400 })
      }
      const csv = await file.text()
      rows = parseCsvCallRows(csv)
    } else {
      const body = await request.json() as unknown
      if (!Array.isArray(body)) {
        return NextResponse.json({ error: { message: 'Body must be a JSON array', code: 'BAD_REQUEST' } }, { status: 400 })
      }
      rows = body as RawCallInput[]
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: { message: 'No rows to process', code: 'BAD_REQUEST' } }, { status: 400 })
    }

    const results = await ingestCalls(rows, operatorOrgId, allowedIds, source)
    const errorCount = results.filter((r) => r.status === 'error').length

    return NextResponse.json({
      data: {
        inserted: results.filter((r) => r.status === 'inserted').length,
        errors: errorCount,
        results,
      },
    }, { status: errorCount > 0 ? 207 : 201 })
  } catch (error) {
    logger.error('POST /api/v1/calls failed', { error })
    return NextResponse.json({ error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
