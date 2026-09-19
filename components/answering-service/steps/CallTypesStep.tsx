'use client'
import { useState, useMemo } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Plus } from '@phosphor-icons/react'
import { FormDescription } from '@/components/ui/form-description'
import type { AnsweringServiceSetup, CallTypes } from '@/schemas/answeringServiceSchema'
import { CallTypeCard } from './CallTypeCard'
import { CallTypeEditor } from './CallTypeEditor'
type CallType = CallTypes[0]
function getIndustryLabel(industry: AnsweringServiceSetup['profile']['industry']): string {
  const labels: Record<AnsweringServiceSetup['profile']['industry'], string> = {
    legal: 'legal',
    medical: 'medical',
    home_services: 'home services',
    real_estate: 'real estate',
    professional_services: 'professional services',
    other: 'your industry',
  }
  return labels[industry] || 'your industry'
}
export function CallTypesStep() {
  const { watch, control } = useFormContext<AnsweringServiceSetup>()
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'callTypes',
  })
  const callTypes = watch('callTypes') || []
  const industry = watch('profile.industry')
  // Industry-specific examples for helper text
  const industryExamples = useMemo(() => {
    switch (industry) {
      case 'legal':
        return 'For example, you might create "New Client Inquiry" (screen and patch during business hours, take message after hours) or "Opposing Counsel" (always take message).'
      case 'medical':
        return 'For example, you might create "Urgent Medical" (always patch through immediately) or "New Patient" (take message with appointment request details).'
      case 'home_services':
        return 'For example, you might create "Emergency Service" (always patch through, especially important in winter for HVAC) or "Service Request" (take message during business hours).'
      case 'real_estate':
        return 'For example, you might create "Property Inquiry" (screen and patch during business hours) or "Urgent Maintenance" (always patch through).'
      default:
        return 'Each call type defines how Answering Service handles that specific kind of call—whether to take a message, transfer immediately, or ask questions first then transfer.'
    }
  }, [industry])
  const [editingCallType, setEditingCallType] = useState<CallType | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const handleAddNew = () => {
    setEditingCallType(null)
    setIsEditorOpen(true)
  }
  const handleEdit = (callType: CallType) => {
    setEditingCallType(callType)
    setIsEditorOpen(true)
  }
  const handleSave = (callType: CallType) => {
    const index = fields.findIndex((f) => f.id === callType.id)
    if (index >= 0) {
      update(index, callType)
    } else {
      append(callType)
    }
    setIsEditorOpen(false)
    setEditingCallType(null)
  }
  const handleDelete = (callTypeId: string) => {
    const index = fields.findIndex((f) => f.id === callTypeId)
    if (index >= 0) {
      remove(index)
    }
  }
  return (
    <div className="space-y-6">
      <FormDescription>
        <strong>Call types</strong> define different categories of calls and how Answering Service handles each. This is the core of your setup—each call type specifies what happens when a caller needs that type of assistance. {industry ? industryExamples : 'Configure handling actions, time-based routing, and what information to collect from callers.'}
      </FormDescription>
      <FormDescription>
        <strong>Action definitions:</strong> <strong>Take Message</strong> = Agent records caller information and message, delivers it via your configured channels. <strong>Patch Through</strong> = Agent immediately transfers the call to you (also called "transfer call"). <strong>Screen and Patch</strong> = Agent asks questions first to qualify the call, then transfers if appropriate. Use time conditioning to handle calls differently during business hours vs after hours.
      </FormDescription>
      {fields.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground mb-4">No call types configured yet</p>
          <Button variant="default" type="button" onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Call Type
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {fields.map((field, index) => {
              const callType = callTypes[index]
              if (!callType) return null
              return (
                <CallTypeCard
                  key={field.id}
                  callType={callType}
                  onEdit={() => handleEdit(callType)}
                />
              )
            })}
          </div>
          <Button type="button" onClick={handleAddNew} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Call Type
          </Button>
        </>
      )}
      <CallTypeEditor
        callType={editingCallType}
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  )
}
