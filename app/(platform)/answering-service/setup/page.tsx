import { getBusinessContext, getUser } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { SetupWizardClient } from '@/components/answering-service/SetupWizardClient'
import { createClient } from '@/lib/supabase/server'
import { WizardService } from '@/lib/services/answering-service/wizardService'

export const dynamic = 'force-dynamic'

export default async function AnsweringServiceSetupPage() {
  const context = await getBusinessContext()
  const user = await getUser()

  if (!context) {
    redirect('/login')
  }

  if (!user) {
    redirect('/login')
  }

  let sessionData = null
  try {
    const supabase = await createClient()
    const wizardService = new WizardService(supabase)
    const session = await wizardService.getOrCreateSession(context.businessId, user.id)
    sessionData = {
      id: session.id,
      currentStep: session.current_step,
      pathSelected: session.path_selected,
      wizardData: session.wizard_data,
    }
  } catch (error) {
    // Session load failure is non-fatal — wizard renders without saved state
    const { logger } = await import('@/lib/utils/logger')
    logger.error('Error fetching wizard session', { error })
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Account Setup</h1>
        <p className="text-sm text-muted-foreground">
          Complete these steps to activate your answering service.
        </p>
      </div>

      <SetupWizardClient
        businessId={context.businessId}
        userId={user.id}
        userRole={context.role}
        userEmail={user.email}
        initialSession={sessionData}
      />
    </div>
  )
}
