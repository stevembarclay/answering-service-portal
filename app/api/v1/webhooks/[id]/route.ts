import { NextRequest, NextResponse } from 'next/server'

import { validateBearerToken } from '@/lib/api/bearerAuth'
import { createClient } from '@/lib/supabase/server'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await validateBearerToken(
    request.headers.get('authorization'),
    'webhooks:write',
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
  )
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.message, code: 'UNAUTHORIZED' } }, { status: auth.status })
  }
  if (!auth.operatorOrgId) {
    return NextResponse.json({ error: { message: 'Forbidden.', code: 'FORBIDDEN' } }, { status: 403 })
  }

  try {
    const { id } = await params
    const supabase = await createClient()
    const { error } = await supabase
      .from('webhook_subscriptions')
      .delete()
      .eq('id', id)
      .eq('operator_org_id', auth.operatorOrgId)

    if (error) {
      throw error
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json({ error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
