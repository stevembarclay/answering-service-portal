import { redirect } from 'next/navigation'
import { getBusinessContext } from '@/lib/auth/server'
import { requireModuleAccess } from '@/lib/middleware/requireModule'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AnsweringServicePage() {
  const context = await getBusinessContext()

  if (!context) {
    redirect('/auth/login')
  }

  // Check module access
  try {
    await requireModuleAccess('answering_service')
  } catch (error) {
    redirect('/dashboard?error=module-access-denied')
  }

  const { businessId } = context

  const supabase = await createClient()
  const { data } = await supabase
    .from('answering_service_wizard_sessions')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle()

  if (data) {
    const isDemo = process.env.DEMO_RESET_ENABLED === 'true'
    redirect(isDemo ? '/answering-service/welcome' : '/answering-service/dashboard')
  }

  redirect('/answering-service/setup')
}


