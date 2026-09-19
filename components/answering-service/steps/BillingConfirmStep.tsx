'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnsweringServiceSetup } from '@/schemas/answeringServiceSchema'

const PLAN_TIERS = [
  { value: 'starter', label: 'Starter - $49/month', description: 'Up to 100 calls/month' },
  { value: 'professional', label: 'Professional - $99/month', description: 'Up to 500 calls/month' },
  { value: 'business', label: 'Business - $199/month', description: 'Up to 2000 calls/month' },
  { value: 'enterprise', label: 'Enterprise - Custom', description: 'Unlimited calls, dedicated support' },
]

export function BillingConfirmStep() {
  const { watch, setValue } = useFormContext<AnsweringServiceSetup>()
  const planTier = (watch('billingConfirm.planTier') as string | undefined) || ''
  const confirmedTerms = (watch('billingConfirm.confirmedTerms') as boolean | undefined) || false

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Select Plan</Label>
        <Select
          value={planTier as string}
          onValueChange={(val: string) => setValue('billingConfirm.planTier', val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a plan..." />
          </SelectTrigger>
          <SelectContent>
            {PLAN_TIERS.map((plan) => (
              <SelectItem key={plan.value} value={plan.value}>
                {plan.label} - {plan.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {planTier && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {planTier && PLAN_TIERS.find((p) => p.value === planTier) && (
              <div>
                <p className="font-medium">
                  {PLAN_TIERS.find((p) => p.value === planTier)?.label}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {PLAN_TIERS.find((p) => p.value === planTier)?.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 p-4 border rounded-lg">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="confirmedTerms"
            checked={confirmedTerms as boolean}
            onCheckedChange={(checked) => setValue('billingConfirm.confirmedTerms', checked === true)}
          />
          <Label htmlFor="confirmedTerms" className="font-normal cursor-pointer">
            I confirm that I understand the terms and conditions, and agree to be billed according to the selected plan.
          </Label>
        </div>
      </div>
    </div>
  )
}
