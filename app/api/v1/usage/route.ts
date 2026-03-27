//
// GET  /api/v1/usage  — Bearer auth (billing:read). For external API consumers.
// POST /api/v1/usage  — Hybrid auth: Bearer (usage:write) OR operator session (admin role).
//   The hybrid POST satisfies AD-2: the operator admin CSV upload panel posts here using
//   the session cookie, and programmatic API clients post here using a Bearer key.
//   One route, one validation layer.
import { NextRequest, NextResponse } from 'next/server'
import { validateBearerToken } from '@/lib/api/bearerAuth'
import { getOperatorContext } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { ingestRows, parseCsvRows, type ParsedRow } from '@/lib/services/operator/usageIngestService'
import { logger } from '@/lib/utils/logger'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'

export async function GET(request: NextRequest) {
  const auth = await validateBearerToken(
    request.headers.get('authorization'),
    'billing:read',
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
  )
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.message, code: 'UNAUTHORIZED' } }, { status: auth.status })
  }

  try {
    const url = new URL(request.url)
    const businessId = auth.businessId ?? url.searchParams.get('business_id')

    const supabase = await createClient()
    let query = supabase
      .from('usage_periods')
      .select('id, business_id, period_date, total_calls, total_minutes, source, status, error_detail, processed_at, created_at')
      .order('period_date', { ascending: false })
      .limit(100)

    if (auth.operatorOrgId) {
      query = query.eq('operator_org_id', auth.operatorOrgId)
    }
    if (businessId) {
      query = query.eq('business_id', businessId)
    } else if (auth.businessId) {
      query = query.eq('business_id', auth.businessId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    logger.error('GET /api/v1/usage failed', { error })
    return NextResponse.json({ error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let operatorOrgId: string
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const auth = await validateBearerToken(authHeader, 'usage:write', clientIp)
    if (!auth.valid) {
      return NextResponse.json({ error: { message: auth.message, code: 'UNAUTHORIZED' } }, { status: auth.status })
    }
    if (!auth.operatorOrgId) {
      return NextResponse.json(
        { error: { message: 'usage:write requires an operator-scoped API key.', code: 'FORBIDDEN' } },
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
    const allowedIds = (businesses ?? []).map((b) => b.id as string)

    let rows: ParsedRow[]
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return NextResponse.json({ error: { message: 'Missing file field', code: 'BAD_REQUEST' } }, { status: 400 })
      }
      const csv = await file.text()
      rows = parseCsvRows(csv)
    } else {
      const body = await request.json() as unknown
      if (!Array.isArray(body)) {
        return NextResponse.json({ error: { message: 'Body must be a JSON array', code: 'BAD_REQUEST' } }, { status: 400 })
      }
      rows = body as ParsedRow[]
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: { message: 'No rows to process', code: 'BAD_REQUEST' } }, { status: 400 })
    }

    const results = await ingestRows(rows, operatorOrgId, allowedIds, authHeader?.startsWith('Bearer ') ? 'api' : 'csv_upload')
    const errorCount = results.filter((r) => r.status === 'error').length

    return NextResponse.json({
      data: {
        processed: results.filter((r) => r.status === 'processed').length,
        errors: errorCount,
        results,
      },
    }, { status: errorCount > 0 ? 207 : 200 })
  } catch (error) {
    logger.error('POST /api/v1/usage failed', { error })
    return NextResponse.json({ error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
