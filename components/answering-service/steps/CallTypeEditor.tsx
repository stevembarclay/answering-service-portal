'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CallTypes, CallHandlingConfig } from '@/schemas/answeringServiceSchema'
import { CallHandlingConfig as CallHandlingConfigComponent } from './CallHandlingConfig'

interface CallTypeEditorProps {
  callType: CallTypes[0] | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (callType: CallTypes[0]) => void
  onDelete?: (callTypeId: string) => void
}

export function CallTypeEditor({ callType, open, onOpenChange, onSave, onDelete }: CallTypeEditorProps) {
  const [name, setName] = useState('')
  const [timeConditionType, setTimeConditionType] = useState<'always' | 'split'>('always')
  const [businessHoursConfig, setBusinessHoursConfig] = useState<CallHandlingConfig | undefined>(undefined)
  const [afterHoursConfig, setAfterHoursConfig] = useState<CallHandlingConfig | undefined>(undefined)
  const [alwaysConfig, setAlwaysConfig] = useState<CallHandlingConfig | undefined>(undefined)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Initialize form when callType changes
  useEffect(() => {
    if (callType) {
      setName(callType.name)
      
      // Determine time condition type
      if (callType.timeConditions.always) {
        setTimeConditionType('always')
        setAlwaysConfig(callType.timeConditions.always)
        setBusinessHoursConfig(undefined)
        setAfterHoursConfig(undefined)
      } else {
        setTimeConditionType('split')
        setBusinessHoursConfig(callType.timeConditions.businessHours)
        setAfterHoursConfig(callType.timeConditions.afterHours)
        setAlwaysConfig(undefined)
      }
    } else {
      // New call type
      setName('')
      setTimeConditionType('always')
      setAlwaysConfig(undefined)
      setBusinessHoursConfig(undefined)
      setAfterHoursConfig(undefined)
    }
  }, [callType])

  const handleSave = () => {
    if (!name.trim()) {
      return
    }

    const timeConditions = timeConditionType === 'always'
      ? {
          always: alwaysConfig,
          businessHours: undefined,
          afterHours: undefined,
        }
      : {
          always: undefined,
          businessHours: businessHoursConfig,
          afterHours: afterHoursConfig,
        }

    const updatedCallType: CallTypes[0] = {
      id: callType?.id || crypto.randomUUID(),
      name: name.trim(),
      timeConditions,
    }

    onSave(updatedCallType)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (callType && onDelete) {
      onDelete(callType.id)
      setShowDeleteConfirm(false)
      onOpenChange(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">
                {callType ? 'Edit Call Type' : 'New Call Type'}
              </h2>
            </div>

            {/* Section 1: Basic Info */}
            <div className="space-y-2">
              <Label htmlFor="callTypeName">
                Call Type Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="callTypeName"
                placeholder="e.g., New Client Inquiry"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Section 2: Time Conditioning */}
            <div className="space-y-3">
              <Label>Time Conditioning</Label>
              <RadioGroup
                value={timeConditionType}
                onValueChange={(val) => {
                  setTimeConditionType(val as 'always' | 'split')
                  if (val === 'always') {
                    setBusinessHoursConfig(undefined)
                    setAfterHoursConfig(undefined)
                    if (!alwaysConfig) {
                      setAlwaysConfig({
                        action: 'take_message',
                        infoToCollect: [
                          { field: 'caller_name', required: true },
                          { field: 'phone_number', required: true },
                        ],
                      })
                    }
                  } else {
                    setAlwaysConfig(undefined)
                    if (!businessHoursConfig) {
                      setBusinessHoursConfig({
                        action: 'take_message',
                        infoToCollect: [
                          { field: 'caller_name', required: true },
                          { field: 'phone_number', required: true },
                        ],
                      })
                    }
                    if (!afterHoursConfig) {
                      setAfterHoursConfig({
                        action: 'take_message',
                        infoToCollect: [
                          { field: 'caller_name', required: true },
                          { field: 'phone_number', required: true },
                        ],
                      })
                    }
                  }
                }}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="always" id="time-always" />
                  <Label htmlFor="time-always" className="font-normal">
                    Same handling 24/7
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="split" id="time-split" />
                  <Label htmlFor="time-split" className="font-normal">
                    Different handling for business hours vs after hours
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Section 3: Call Handling Config */}
            {timeConditionType === 'always' ? (
              <CallHandlingConfigComponent
                title="24/7 Handling"
                value={alwaysConfig}
                onChange={setAlwaysConfig}
              />
            ) : (
              <div className="space-y-4">
                <CallHandlingConfigComponent
                  title="Business Hours"
                  value={businessHoursConfig}
                  onChange={setBusinessHoursConfig}
                />
                <CallHandlingConfigComponent
                  title="After Hours"
                  value={afterHoursConfig}
                  onChange={setAfterHoursConfig}
                />
              </div>
            )}

            {/* Section 5: Actions */}
            <div className="flex justify-between pt-4 border-t">
              <div>
                {callType && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  type="button"
                  onClick={handleSave}
                  disabled={!name.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Call Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{callType?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

