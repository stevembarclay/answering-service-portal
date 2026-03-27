'use client'
import { useFormContext } from 'react-hook-form'
import { useEffect, useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Warning as AlertTriangle, Info } from '@phosphor-icons/react'
import { FormDescription } from '@/components/ui/form-description'
import type { AnsweringServiceSetup } from '@/schemas/answeringServiceSchema'
export function EscalationRulesStep() {
  const { watch, setValue, formState: { errors } } = useFormContext<AnsweringServiceSetup>()
  const escalation = watch('escalation') || { enabled: false }
  const callTypes = watch('callTypes') || []
  const industry = watch('profile.industry')
  // Industry-specific escalation examples
  const industryEscalationExamples = useMemo(() => {
    switch (industry) {
      case 'medical':
        return `Good criteria: "Caller states it's a medical emergency" or "Caller says patient cannot wait until next appointment". Avoid clinical symptom descriptions—focus on caller statements and urgency level.`
      case 'legal':
        return 'Good criteria: "Caller is in custody", "Time-sensitive court deadline mentioned", or "Opposing counsel with urgent matter". These indicate situations requiring immediate attention.'
      case 'home_services':
        return 'Good criteria: "No heat in winter", "Water leak causing damage", or "Electrical hazard present". Focus on safety and property damage that cannot wait.'
      case 'real_estate':
        return 'Good criteria: "Active water leak at property", "Locked out and tenant emergency", or "Security breach at property". Prioritize property protection and tenant safety.'
      default:
        return 'Good criteria describe specific situations that require immediate attention—not routine matters. Think about what would legitimately justify waking someone up or interrupting their day.'
    }
  }, [industry])
  // Initialize callTypeRules if needed
  const callTypeRules = escalation.callTypeRules || {}
  // Ensure all call types have rules initialized
  useEffect(() => {
    if (callTypes.length === 0) return
    const currentRules = escalation.callTypeRules || {}
    const callTypeIds = new Set(callTypes.map((ct) => ct.id))
    const existingRuleIds = new Set(Object.keys(currentRules))
    // Check if any new call types need rules initialized
    const needsUpdate = Array.from(callTypeIds).some((id) => !existingRuleIds.has(id))
    if (needsUpdate) {
      const rulesToUpdate: Record<string, {
        canEscalate: boolean
        criteria?: string
        escalateTo?: string
        timeCondition?: 'business_hours' | 'after_hours' | '24_hours'
      }> = { ...currentRules }
      callTypes.forEach((callType) => {
        if (!rulesToUpdate[callType.id]) {
          rulesToUpdate[callType.id] = { canEscalate: false }
        }
      })
      setValue('escalation.callTypeRules', rulesToUpdate, { shouldValidate: false })
    }
  }, [callTypes, escalation.callTypeRules, setValue])
  const updateCallTypeRule = (
    callTypeId: string,
    updates: Partial<{
      canEscalate: boolean
      criteria?: string
      escalateTo?: string
      timeCondition?: 'business_hours' | 'after_hours' | '24_hours'
      useGlobalContact?: boolean
    }>
  ): void => {
    const currentRule = callTypeRules[callTypeId] || { canEscalate: false }
    const newRule = {
      ...currentRule,
      ...updates,
    }
    // If useGlobalContact is true, clear escalateTo
    if (updates.useGlobalContact === true) {
      newRule.escalateTo = undefined
    }
    // If useGlobalContact is false and escalateTo is empty, we should handle that
    if (updates.useGlobalContact === false && !updates.escalateTo) {
      // Keep the existing escalateTo or set to empty string
      newRule.escalateTo = currentRule.escalateTo || ''
    }
    const updatedRules = {
      ...callTypeRules,
      [callTypeId]: newRule,
    }
    setValue('escalation.callTypeRules', updatedRules)
  }
  const getUseGlobalContact = (callTypeId: string): boolean => {
    const rule = callTypeRules[callTypeId]
    return rule?.canEscalate && !rule?.escalateTo
  }
  return (
    <div className="space-y-6">
      <FormDescription>
        <strong>Escalation</strong> allows Answering Service to immediately notify you (via call or SMS) when certain call types meet specific urgent criteria, even outside business hours. This is for genuine emergencies that cannot wait—think situations where you'd want to be woken up or interrupted immediately.
      </FormDescription>
      {/* Section 1: Enable Escalation */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="escalation-enabled"
            checked={escalation.enabled || false}
            onCheckedChange={(checked) => {
              setValue('escalation.enabled', checked === true)
            }}
          />
          <Label htmlFor="escalation-enabled" className="font-normal cursor-pointer">
            Enable emergency escalation
          </Label>
        </div>
        {errors.escalation?.enabled && (
          <p className="text-sm text-destructive">{errors.escalation.enabled.message}</p>
        )}
        <FormDescription>
          When enabled, Answering Service will call or SMS you immediately when escalation criteria are met. Only enable this for situations that truly require immediate attention—avoid routine matters that can wait for standard message delivery.
        </FormDescription>
      </div>
      {!escalation.enabled ? (
        <Alert>
          <AlertDescription>
            Escalation is not enabled. All calls will follow standard handling rules.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Section 2: Global Escalation Contact */}
          <div className="space-y-2">
            <Label htmlFor="global-escalation-contact">
              Who should receive escalated calls? <span className="text-destructive">*</span>
            </Label>
            <FormDescription>
              The default phone number that receives all escalated calls. You can override this for specific call types if different situations should go to different contacts (e.g., medical emergencies go to on-call doctor, legal emergencies go to attorney).
            </FormDescription>
            <Input
              id="global-escalation-contact"
              type="tel"
              placeholder="+1234567890"
              value={escalation.globalEscalationContact || ''}
              onChange={(e) => setValue('escalation.globalEscalationContact', e.target.value)}
              className={errors.escalation?.globalEscalationContact ? 'border-destructive' : ''}
              aria-invalid={errors.escalation?.globalEscalationContact ? 'true' : 'false'}
            />
            {errors.escalation?.globalEscalationContact && (
              <p className="text-sm text-destructive">
                {errors.escalation.globalEscalationContact.message || 'Global escalation contact is required when escalation is enabled'}
              </p>
            )}
            {!errors.escalation?.globalEscalationContact && escalation.enabled && !escalation.globalEscalationContact && (
              <p className="text-xs text-muted-foreground">
                Required when escalation is enabled
              </p>
            )}
          </div>
          {/* Section 3: Call Type Escalation Rules */}
          {callTypes.length > 0 && (
            <div className="space-y-4">
              <Label>Which call types can trigger escalation?</Label>
              <FormDescription>
                Not all call types need escalation—only enable it for situations where immediate notification is justified. For each call type, define specific criteria that indicate an emergency. {industry ? industryEscalationExamples : 'Criteria should be clear and objective, describing what the caller says or the situation they describe.'}
              </FormDescription>
              <div className="space-y-3">
                {callTypes.map((callType) => {
                  const rule = callTypeRules[callType.id] || { canEscalate: false }
                  const useGlobalContact = getUseGlobalContact(callType.id)
                  const isExpanded = rule.canEscalate
                  return (
                    <Card key={callType.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`escalate-${callType.id}`}
                            checked={rule.canEscalate || false}
                            onCheckedChange={(checked) => {
                              updateCallTypeRule(callType.id, { canEscalate: checked === true })
                            }}
                          />
                          <Label
                            htmlFor={`escalate-${callType.id}`}
                            className="font-semibold cursor-pointer"
                          >
                            {callType.name}
                          </Label>
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent className="space-y-4 pt-0">
                          {/* Criteria */}
                          <div className="space-y-2">
                            <Label htmlFor={`criteria-${callType.id}`}>
                              Criteria <span className="text-destructive">*</span>
                            </Label>
                            <FormDescription>
                              Describe specific situations that should trigger escalation for this call type. Be specific and objective—focus on what the caller says or describes, not general urgency. Examples: "Caller states medical emergency", "Water leak causing property damage", "Time-sensitive court deadline mentioned".
                            </FormDescription>
                            <Textarea
                              id={`criteria-${callType.id}`}
                              placeholder="Describe when this call type should escalate"
                              rows={3}
                              value={rule.criteria || ''}
                              onChange={(e) => {
                                updateCallTypeRule(callType.id, { criteria: e.target.value })
                              }}
                              className={errors.escalation?.callTypeRules?.[callType.id]?.criteria ? 'border-destructive' : ''}
                              aria-invalid={errors.escalation?.callTypeRules?.[callType.id]?.criteria ? 'true' : 'false'}
                            />
                            {errors.escalation?.callTypeRules?.[callType.id]?.criteria && (
                              <p className="text-sm text-destructive">
                                {errors.escalation.callTypeRules[callType.id]?.criteria?.message || 'Criteria is required when escalation is enabled for this call type'}
                              </p>
                            )}
                            {!errors.escalation?.callTypeRules?.[callType.id]?.criteria && rule.canEscalate && !rule.criteria && (
                              <p className="text-xs text-muted-foreground">
                                Required when escalation is enabled for this call type
                              </p>
                            )}
                          </div>
                          {/* Time Condition */}
                          <div className="space-y-2">
                            <Label>When</Label>
                            <FormDescription>
                              Control when escalation can trigger for this call type. <strong>24 hours:</strong> Always escalate if criteria are met. <strong>Business hours only:</strong> Only escalate during your defined business hours. <strong>After hours only:</strong> Only escalate outside business hours (for situations that can wait during business hours but are urgent at night).
                            </FormDescription>
                            <RadioGroup
                              value={rule.timeCondition || '24_hours'}
                              onValueChange={(val) => {
                                updateCallTypeRule(callType.id, {
                                  timeCondition: val as 'business_hours' | 'after_hours' | '24_hours',
                                })
                              }}
                              className="space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="24_hours" id={`${callType.id}-24h`} />
                                <Label htmlFor={`${callType.id}-24h`} className="font-normal">
                                  24 hours
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="business_hours" id={`${callType.id}-bh`} />
                                <Label htmlFor={`${callType.id}-bh`} className="font-normal">
                                  Business hours only
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="after_hours" id={`${callType.id}-ah`} />
                                <Label htmlFor={`${callType.id}-ah`} className="font-normal">
                                  After hours only
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                          {/* Escalate To */}
                          <div className="space-y-2">
                            <Label>Escalate to</Label>
                            <RadioGroup
                              value={useGlobalContact ? 'global' : 'custom'}
                              onValueChange={(val) => {
                                if (val === 'global') {
                                  updateCallTypeRule(callType.id, { useGlobalContact: true, escalateTo: undefined })
                                } else {
                                  updateCallTypeRule(callType.id, { useGlobalContact: false })
                                }
                              }}
                              className="space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="global" id={`${callType.id}-global`} />
                                <Label htmlFor={`${callType.id}-global`} className="font-normal">
                                  Use global contact
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="custom" id={`${callType.id}-custom`} />
                                <Label htmlFor={`${callType.id}-custom`} className="font-normal">
                                  Different number:
                                </Label>
                              </div>
                            </RadioGroup>
                            {!useGlobalContact && (
                              <div className="space-y-2">
                                <Label htmlFor={`escalate-to-${callType.id}`}>
                                  Escalation Contact <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id={`escalate-to-${callType.id}`}
                                  type="tel"
                                  placeholder="+1234567890"
                                  value={rule.escalateTo || ''}
                                  onChange={(e) => {
                                    updateCallTypeRule(callType.id, { escalateTo: e.target.value })
                                  }}
                                  className={errors.escalation?.callTypeRules?.[callType.id]?.escalateTo ? 'border-destructive' : ''}
                                  aria-invalid={errors.escalation?.callTypeRules?.[callType.id]?.escalateTo ? 'true' : 'false'}
                                />
                                {errors.escalation?.callTypeRules?.[callType.id]?.escalateTo && (
                                  <p className="text-sm text-destructive">
                                    {errors.escalation.callTypeRules[callType.id]?.escalateTo?.message || 'Escalation contact is required when not using global contact'}
                                  </p>
                                )}
                                {!errors.escalation?.callTypeRules?.[callType.id]?.escalateTo && !useGlobalContact && rule.canEscalate && !rule.escalateTo && (
                                  <p className="text-xs text-muted-foreground">
                                    Required when not using global contact
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
          {callTypes.length === 0 && (
            <Alert>
              <AlertDescription>
                No call types configured yet. Please configure call types in the previous step first.
              </AlertDescription>
            </Alert>
          )}
          {/* Section 4: Industry-Specific Warnings */}
          {industry === 'medical' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>HIPAA Compliance Note:</strong> Escalation criteria should describe caller behavior (e.g., &quot;caller states it&apos;s an emergency&quot;) not clinical symptoms. Our team will review your setup for compliance.
              </AlertDescription>
            </Alert>
          )}
          {industry === 'legal' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>For legal practices:</strong> Common escalation criteria include &quot;caller is in custody&quot;, &quot;time-sensitive court deadline&quot;, or &quot;opposing counsel with urgent matter&quot;.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  )
}
