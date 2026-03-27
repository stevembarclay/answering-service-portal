'use client'
import { useState, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PencilSimple as Edit2, X } from '@phosphor-icons/react'
import { FormDescription } from '@/components/ui/form-description'
import type { AnsweringServiceSetup } from '@/schemas/answeringServiceSchema'
type Channel = 'email' | 'sms' | 'portal'
/**
 * Format channel array into readable string
 */
function formatChannels(channels: Channel[]): string {
  if (channels.length === 0) return 'None'
  return channels
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join(' + ')
}
export function MessageDeliveryStep() {
  const { watch, setValue, formState: { errors } } = useFormContext<AnsweringServiceSetup>()
  const callTypes = watch('callTypes') || []
  // Global defaults
  const globalChannels = watch('messageDelivery.globalDefaults.channels') || []
  const globalEmailAddress = watch('messageDelivery.globalDefaults.emailAddress') || ''
  const globalSmsNumber = watch('messageDelivery.globalDefaults.smsNumber') || ''
  const globalUrgentSmsEnabled = watch('messageDelivery.globalDefaults.urgentSmsEnabled') || false
  // Call type overrides
  const callTypeOverrides = watch('messageDelivery.callTypeOverrides') || {}
  // Track which call type override is being edited
  const [editingCallTypeId, setEditingCallTypeId] = useState<string | null>(null)
  /**
   * Toggle a global channel
   */
  const toggleGlobalChannel = (channel: Channel) => {
    const current = globalChannels.includes(channel)
    if (current) {
      setValue('messageDelivery.globalDefaults.channels', globalChannels.filter((c) => c !== channel))
    } else {
      setValue('messageDelivery.globalDefaults.channels', [...globalChannels, channel])
    }
  }
  /**
   * Get effective channels for a call type (global + override)
   */
  const getEffectiveChannels = (callTypeId: string): Channel[] => {
    const override = callTypeOverrides[callTypeId]
    if (override?.channels) {
      return override.channels
    }
    return globalChannels
  }
  /**
   * Get effective urgent status for a call type (global + override)
   */
  const getEffectiveUrgent = (callTypeId: string): boolean => {
    const override = callTypeOverrides[callTypeId]
    if (override?.urgentOverride !== undefined) {
      return override.urgentOverride
    }
    return globalUrgentSmsEnabled
  }
  /**
   * Check if a call type has custom overrides
   */
  const hasOverride = (callTypeId: string): boolean => {
    const override = callTypeOverrides[callTypeId]
    return override?.channels !== undefined || override?.urgentOverride !== undefined
  }
  /**
   * Set override for a call type (without closing editor)
   */
  const setCallTypeOverride = (callTypeId: string, override: { channels?: Channel[]; urgentOverride?: boolean } | null, closeEditor = false) => {
    const currentOverrides = { ...callTypeOverrides }
    if (override === null) {
      // Remove override (use defaults)
      delete currentOverrides[callTypeId]
    } else {
      // Set or update override
      currentOverrides[callTypeId] = {
        ...currentOverrides[callTypeId],
        ...override,
      }
    }
    setValue('messageDelivery.callTypeOverrides', currentOverrides)
    if (closeEditor) {
      setEditingCallTypeId(null)
    }
  }
  /**
   * Toggle channel in call type override
   */
  const toggleOverrideChannel = (callTypeId: string, channel: Channel) => {
    const currentOverride = callTypeOverrides[callTypeId] || {}
    const currentChannels = currentOverride.channels || [...globalChannels]
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter((c) => c !== channel)
      : [...currentChannels, channel]
    setCallTypeOverride(callTypeId, { ...currentOverride, channels: newChannels.length > 0 ? newChannels : undefined }, false)
  }
  return (
    <div className="space-y-8">
      <FormDescription>
        Configure how Answering Service delivers messages to you. You can set global defaults that apply to all call types, then override specific call types if needed. Choose one or multiple delivery channels—Email, SMS, or Portal—depending on how quickly you need to be notified.
      </FormDescription>
      {/* Section 1: Default Delivery Settings */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>How should we deliver messages by default?</Label>
          <FormDescription>
            <strong>Email:</strong> Messages delivered to your inbox—good for detailed information and records. <strong>SMS:</strong> Text notifications for quick alerts (can enable urgent SMS for immediate delivery). <strong>Portal:</strong> Messages appear in your Answering Service dashboard only. You can select multiple channels—they work together.
          </FormDescription>
        </div>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="channel-email"
              checked={globalChannels.includes('email')}
              onCheckedChange={() => toggleGlobalChannel('email')}
            />
            <Label htmlFor="channel-email" className="font-normal cursor-pointer">
              Email
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="channel-sms"
              checked={globalChannels.includes('sms')}
              onCheckedChange={() => toggleGlobalChannel('sms')}
            />
            <Label htmlFor="channel-sms" className="font-normal cursor-pointer">
              SMS
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="channel-portal"
              checked={globalChannels.includes('portal')}
              onCheckedChange={() => toggleGlobalChannel('portal')}
            />
            <Label htmlFor="channel-portal" className="font-normal cursor-pointer">
              Portal Only
            </Label>
          </div>
        </div>
        {errors.messageDelivery?.globalDefaults?.channels && (
          <p className="text-sm text-destructive">
            {errors.messageDelivery.globalDefaults.channels.message}
          </p>
        )}
      </div>
      {/* Email Input (shown when email is selected) */}
      {globalChannels.includes('email') && (
        <div className="space-y-2">
          <Label htmlFor="emailAddress">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="emailAddress"
            type="email"
            placeholder="your@email.com"
            value={globalEmailAddress}
            onChange={(e) => setValue('messageDelivery.globalDefaults.emailAddress', e.target.value)}
            className={errors.messageDelivery?.globalDefaults?.emailAddress ? 'border-destructive' : ''}
            aria-invalid={errors.messageDelivery?.globalDefaults?.emailAddress ? 'true' : 'false'}
          />
          {errors.messageDelivery?.globalDefaults?.emailAddress && (
            <p className="text-sm text-destructive">
              {errors.messageDelivery.globalDefaults.emailAddress.message || 'Email address is required when email delivery is selected'}
            </p>
          )}
          {!errors.messageDelivery?.globalDefaults?.emailAddress && globalChannels.includes('email') && !globalEmailAddress && (
            <p className="text-xs text-muted-foreground">
              Required when email channel is selected
            </p>
          )}
        </div>
      )}
      {/* SMS Input (shown when SMS is selected) */}
      {globalChannels.includes('sms') && (
        <>
          <div className="space-y-2">
            <Label htmlFor="smsNumber">
              SMS Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="smsNumber"
              type="tel"
              placeholder="+1234567890"
              value={globalSmsNumber}
              onChange={(e) => setValue('messageDelivery.globalDefaults.smsNumber', e.target.value)}
              className={errors.messageDelivery?.globalDefaults?.smsNumber ? 'border-destructive' : ''}
              aria-invalid={errors.messageDelivery?.globalDefaults?.smsNumber ? 'true' : 'false'}
            />
            {errors.messageDelivery?.globalDefaults?.smsNumber && (
              <p className="text-sm text-destructive">
                {errors.messageDelivery.globalDefaults.smsNumber.message || 'Phone number is required when SMS delivery is selected'}
              </p>
            )}
            {!errors.messageDelivery?.globalDefaults?.smsNumber && globalChannels.includes('sms') && !globalSmsNumber && (
              <p className="text-xs text-muted-foreground">
                Required when SMS channel is selected
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="urgentSmsEnabled"
                checked={globalUrgentSmsEnabled}
                onCheckedChange={(checked) => setValue('messageDelivery.globalDefaults.urgentSmsEnabled', checked === true)}
              />
              <Label htmlFor="urgentSmsEnabled" className="font-normal cursor-pointer">
                Send SMS immediately for urgent messages
              </Label>
            </div>
            <FormDescription>
              When enabled, urgent messages (determined by your escalation rules or call type settings) trigger immediate SMS delivery instead of following standard delivery timing. This ensures you're notified instantly for time-sensitive matters.
            </FormDescription>
          </div>
        </>
      )}
      {/* Section 2: Call Type Overrides */}
      {callTypes.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Customize delivery for specific call types</Label>
            <FormDescription>
              Override default delivery settings for specific call types. For example, you might want "Emergency" calls to always send SMS immediately, while "General Inquiry" calls only go to email. Each call type can have different channels and urgent SMS settings.
            </FormDescription>
          </div>
          <div className="space-y-3">
            {callTypes.map((callType) => {
              const callTypeId = callType.id
              const callTypeName = callType.name
              const isEditing = editingCallTypeId === callTypeId
              const hasCustom = hasOverride(callTypeId)
              const override = callTypeOverrides[callTypeId] || {}
              const overrideChannels = override.channels || globalChannels
              const overrideUrgent = override.urgentOverride !== undefined ? override.urgentOverride : globalUrgentSmsEnabled
              return (
                <Card key={callTypeId} className="border-input">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">{callTypeName}</Label>
                        {!isEditing && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCallTypeId(callTypeId)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </div>
                      {!isEditing ? (
                        <RadioGroup
                          value={hasCustom ? 'custom' : 'default'}
                          onValueChange={(val) => {
                            if (val === 'default') {
                              setCallTypeOverride(callTypeId, null, true)
                            } else {
                              setEditingCallTypeId(callTypeId)
                            }
                          }}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="default" id={`${callTypeId}-default`} />
                            <Label htmlFor={`${callTypeId}-default`} className="font-normal cursor-pointer">
                              Use default settings
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id={`${callTypeId}-custom`} />
                            <Label htmlFor={`${callTypeId}-custom`} className="font-normal cursor-pointer">
                              Custom: {formatChannels(overrideChannels)}, Urgent: {overrideUrgent ? 'Yes' : 'No'}
                            </Label>
                          </div>
                        </RadioGroup>
                      ) : (
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-input">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-medium">Custom Override</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCallTypeId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-sm">Delivery Channels</Label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${callTypeId}-override-email`}
                                  checked={overrideChannels.includes('email')}
                                  onCheckedChange={() => toggleOverrideChannel(callTypeId, 'email')}
                                />
                                <Label htmlFor={`${callTypeId}-override-email`} className="font-normal cursor-pointer text-sm">
                                  Email
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${callTypeId}-override-sms`}
                                  checked={overrideChannels.includes('sms')}
                                  onCheckedChange={() => toggleOverrideChannel(callTypeId, 'sms')}
                                />
                                <Label htmlFor={`${callTypeId}-override-sms`} className="font-normal cursor-pointer text-sm">
                                  SMS
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${callTypeId}-override-portal`}
                                  checked={overrideChannels.includes('portal')}
                                  onCheckedChange={() => toggleOverrideChannel(callTypeId, 'portal')}
                                />
                                <Label htmlFor={`${callTypeId}-override-portal`} className="font-normal cursor-pointer text-sm">
                                  Portal
                                </Label>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                              <Checkbox
                                id={`${callTypeId}-override-urgent`}
                                checked={overrideUrgent}
                                onCheckedChange={(checked) => {
                                  const currentOverride = callTypeOverrides[callTypeId] || {}
                                  setCallTypeOverride(callTypeId, {
                                    ...currentOverride,
                                    urgentOverride: checked === true,
                                  }, false)
                                }}
                              />
                              <Label htmlFor={`${callTypeId}-override-urgent`} className="font-normal cursor-pointer text-sm">
                                Send SMS immediately for urgent messages
                              </Label>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setCallTypeOverride(callTypeId, null, true)}
                              >
                                Use Defaults
                              </Button>
                              <Button
                                variant="default"
                                type="button"
                                size="sm"
                                onClick={() => setEditingCallTypeId(null)}
                              >
                                Done
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
      {/* Section 3: Delivery Summary */}
      {callTypes.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Delivery Summary</Label>
          </div>
          <div className="rounded-md border border-input">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Call Type</TableHead>
                  <TableHead>Delivery Method</TableHead>
                  <TableHead>Urgent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callTypes.map((callType) => {
                  const effectiveChannels = getEffectiveChannels(callType.id)
                  const effectiveUrgent = getEffectiveUrgent(callType.id)
                  return (
                    <TableRow key={callType.id}>
                      <TableCell className="font-medium">{callType.name}</TableCell>
                      <TableCell>{formatChannels(effectiveChannels)}</TableCell>
                      <TableCell>{effectiveUrgent ? 'Yes' : 'No'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
