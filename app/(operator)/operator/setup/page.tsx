import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import {
  getOperatorSetupStatus,
} from '@/lib/services/operator/operatorService'
import { OperatorSetupWizard } from '@/components/operator/OperatorSetupWizard'

export default async function OperatorSetupPage() {
  const context = await checkOperatorAccessOrThrow()
  const status = await getOperatorSetupStatus(context.operatorOrgId)

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Setup Guide</h1>
        <p className="text-sm text-muted-foreground">
          Complete these steps to brand the portal, add clients, and verify live call flow.
        </p>
      </div>

      <OperatorSetupWizard status={status} />
    </div>
  )
}
