import { NextRequest, NextResponse } from 'next/server'

import { validateBearerToken } from '@/lib/api/bearerAuth'
import { createClient } from '@/lib/supabase/server'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateBearerToken(
    request.headers.get('authorization'),
    'calls:read',
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
  )
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.message, code: 'UNAUTHORIZED' } }, { status: auth.status })
  }

  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: call, error } = await supabase
      .from('call_logs')
      .select('*, message_actions(*)')
      .eq('id', id)
      .maybeSingle()

    if (error || !call) {
      return NextResponse.json({ error: { message: 'Call not found.', code: 'NOT_FOUND' } }, { status: 404 })
    }

    if (auth.businessId && (call as { business_id: string }).business_id !== auth.businessId) {
      return NextResponse.json({ error: { message: 'Call not found.', code: 'NOT_FOUND' } }, { status: 404 })
    }

    if (auth.operatorOrgId) {
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', (call as { business_id: string }).business_id)
        .eq('operator_org_id', auth.operatorOrgId)
        .maybeSingle()

      if (!business) {
        return NextResponse.json({ error: { message: 'Call not found.', code: 'NOT_FOUND' } }, { status: 404 })
      }
    }

    return NextResponse.json({ data: call })
  } catch (error) {
    return NextResponse.json({ error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
