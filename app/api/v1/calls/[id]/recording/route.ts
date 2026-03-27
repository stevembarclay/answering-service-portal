import { NextRequest, NextResponse } from 'next/server'
import { validateBearerToken } from '@/lib/api/bearerAuth'
import { getOperatorContext } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { logger } from '@/lib/utils/logger'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
}

const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: callId } = await params
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
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: { message: 'Missing file field', code: 'BAD_REQUEST' } }, { status: 400 })
    }

    const ext = ALLOWED_MIME_TYPES[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: { message: `Unsupported audio type: ${file.type}. Allowed: mp3, wav, m4a.`, code: 'BAD_REQUEST' } },
        { status: 400 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: { message: 'File exceeds 50 MB limit.', code: 'BAD_REQUEST' } },
        { status: 400 }
      )
    }

    const supabase = await createClient()           // for reads (RLS enforced)
    const serviceSupabase = createServiceRoleClient() // for writes (bypasses RLS)

    // Verify this call belongs to the operator's org
    const { data: callRow } = await supabase
      .from('call_logs')
      .select('id, business_id')
      .eq('id', callId)
      .maybeSingle()

    if (!callRow) {
      return NextResponse.json({ error: { message: 'Call not found.', code: 'NOT_FOUND' } }, { status: 404 })
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', (callRow as { id: string; business_id: string }).business_id)
      .eq('operator_org_id', operatorOrgId)
      .maybeSingle()

    if (!business) {
      return NextResponse.json(
        { error: { message: 'Call does not belong to your operator org.', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const businessId = (callRow as { id: string; business_id: string }).business_id
    const storagePath = `${businessId}/${callId}.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await serviceSupabase.storage
      .from('call-recordings')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      logger.error('Recording upload to storage failed', { callId, error: uploadError })
      return NextResponse.json({ error: { message: 'Storage upload failed.', code: 'INTERNAL_ERROR' } }, { status: 500 })
    }

    const { error: updateError } = await serviceSupabase
      .from('call_logs')
      .update({ has_recording: true })
      .eq('id', callId)
      .eq('business_id', businessId)

    if (updateError) {
      logger.error('Failed to set has_recording=true', { callId, error: updateError })
      // Storage upload succeeded — not a fatal error; the flag can be fixed manually
    }

    return NextResponse.json({ data: { callId, storagePath } }, { status: 201 })
  } catch (error) {
    logger.error('POST /api/v1/calls/[id]/recording failed', { callId, error })
    return NextResponse.json({ error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
