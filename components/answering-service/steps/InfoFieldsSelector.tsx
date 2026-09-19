'use client'
import { useState, useEffect, useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Plus, X } from '@phosphor-icons/react'
import type { CallHandlingConfig } from '@/schemas/answeringServiceSchema'
interface InfoFieldsSelectorProps {
  value: CallHandlingConfig['infoToCollect'] | undefined
  onChange: (fields: CallHandlingConfig['infoToCollect']) => void
}
const COMMON_FIELDS = [
  { field: 'caller_name', label: 'Caller Name', required: true, disabled: true },
  { field: 'phone_number', label: 'Phone Number', required: true, disabled: true },
  { field: 'email_address', label: 'Email Address', required: false, disabled: false },
  { field: 'reason_for_call', label: 'Reason for Call', required: false, disabled: false },
  { field: 'best_time_to_call_back', label: 'Best Time to Call Back', required: false, disabled: false },
  { field: 'company_organization', label: 'Company/Organization', required: false, disabled: false },
]
export function InfoFieldsSelector({ value = [], onChange }: InfoFieldsSelectorProps) {
  // Ensure required fields are always included in display
  const effectiveValue = useMemo(() => {
    const requiredFields: Array<{ field: string; required: boolean; customLabel?: string }> = COMMON_FIELDS
      .filter((cf) => cf.required)
      .map((cf) => ({ field: cf.field, required: true }))
    const existingFields = value || []
    // Merge: required fields + existing non-required fields
    const fieldsWithRequired: Array<{ field: string; required: boolean; customLabel?: string }> = [...requiredFields]
    existingFields.forEach((f) => {
      if (!COMMON_FIELDS.some((cf) => cf.field === f.field && cf.required)) {
        fieldsWithRequired.push(f)
      }
    })
    return fieldsWithRequired
  }, [value])
  const [customFields, setCustomFields] = useState<Array<{ field: string; label: string }>>(
    effectiveValue
      .filter((f) => !COMMON_FIELDS.some((cf) => cf.field === f.field))
      .map((f) => ({ field: f.field, label: (f.customLabel ?? f.field) }))
  )
  const [newCustomField, setNewCustomField] = useState('')
  // Initialize with required fields if value is empty
  useEffect(() => {
    if (value.length === 0) {
      const requiredFields = COMMON_FIELDS
        .filter((cf) => cf.required)
        .map((cf) => ({ field: cf.field, required: true }))
      onChange(requiredFields)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const getFieldValue = (fieldName: string): boolean => {
    return effectiveValue.some((f) => f.field === fieldName) || false
  }
  const getFieldRequired = (fieldName: string): boolean => {
    const field = effectiveValue.find((f) => f.field === fieldName)
    return field?.required || false
  }
  const toggleField = (fieldName: string, label: string, required: boolean, disabled: boolean) => {
    if (disabled) return // Can't toggle required fields
    const requiredFields = COMMON_FIELDS
      .filter((cf) => cf.required)
      .map((cf) => ({ field: cf.field, required: true }))
    const currentFields = [...(value || [])]
    const existingIndex = currentFields.findIndex((f) => f.field === fieldName)
    if (existingIndex >= 0) {
      // Remove field (but not if it's required)
      const field = COMMON_FIELDS.find((cf) => cf.field === fieldName)
      if (!field?.required) {
        currentFields.splice(existingIndex, 1)
      }
    } else {
      // Add field
      currentFields.push({ field: fieldName, required, customLabel: label })
    }
    // Always include required fields
    const allFields = [...requiredFields, ...currentFields.filter((f) => !COMMON_FIELDS.some((cf) => cf.field === f.field && cf.required))]
    onChange(allFields.length > 0 ? allFields : undefined)
  }
  const toggleRequired = (fieldName: string) => {
    const field = COMMON_FIELDS.find((cf) => cf.field === fieldName)
    if (field?.required) return // Can't toggle required fields
    const requiredFields = COMMON_FIELDS
      .filter((cf) => cf.required)
      .map((cf) => ({ field: cf.field, required: true }))
    const currentFields = [...(value || [])]
    const existingIndex = currentFields.findIndex((f) => f.field === fieldName)
    if (existingIndex >= 0) {
      currentFields[existingIndex] = {
        ...currentFields[existingIndex],
        required: !currentFields[existingIndex].required,
      }
      // Always include required fields
      const allFields = [...requiredFields, ...currentFields.filter((f) => !COMMON_FIELDS.some((cf) => cf.field === f.field && cf.required))]
      onChange(allFields.length > 0 ? allFields : undefined)
    }
  }
  const addCustomField = () => {
    if (newCustomField.trim()) {
      const fieldName = newCustomField.trim().toLowerCase().replace(/\s+/g, '_')
      const newField = { field: fieldName, label: newCustomField.trim() }
      setCustomFields([...customFields, newField])
      // Add to value, ensuring required fields are included
      const requiredFields = COMMON_FIELDS
        .filter((cf) => cf.required)
        .map((cf) => ({ field: cf.field, required: true }))
      const currentFields = [...(value || []), { field: fieldName, required: false, customLabel: newCustomField.trim() }]
      const allFields = [...requiredFields, ...currentFields.filter((f) => !COMMON_FIELDS.some((cf) => cf.field === f.field && cf.required))]
      onChange(allFields.length > 0 ? allFields : undefined)
      setNewCustomField('')
    }
  }
  const removeCustomField = (fieldName: string) => {
    setCustomFields(customFields.filter((f) => f.field !== fieldName))
    const requiredFields = COMMON_FIELDS
      .filter((cf) => cf.required)
      .map((cf) => ({ field: cf.field, required: true }))
    const currentFields = (value || []).filter((f) => f.field !== fieldName)
    const allFields = [...requiredFields, ...currentFields.filter((f) => !COMMON_FIELDS.some((cf) => cf.field === f.field && cf.required))]
    onChange(allFields.length > 0 ? allFields : undefined)
  }
  return (
    <div className="space-y-4">
      <Label>Information to Collect</Label>
      <div className="space-y-2">
        {COMMON_FIELDS.map((commonField) => {
          const isChecked = getFieldValue(commonField.field)
          const isRequired = getFieldRequired(commonField.field) || commonField.required
          return (
            <div key={commonField.field} className="flex items-center space-x-2">
              <Checkbox
                id={`field-${commonField.field}`}
                checked={isChecked}
                onCheckedChange={() => toggleField(commonField.field, commonField.label, isRequired, commonField.disabled)}
                disabled={commonField.disabled}
              />
              <Label
                htmlFor={`field-${commonField.field}`}
                className="font-normal cursor-pointer flex-1"
              >
                {commonField.label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {isChecked && !commonField.disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRequired(commonField.field)}
                  className="text-xs"
                >
                  {isRequired ? 'Required' : 'Optional'}
                </Button>
              )}
            </div>
          )
        })}
        {customFields.map((customField) => {
          const isChecked = getFieldValue(customField.field)
          const isRequired = getFieldRequired(customField.field)
          return (
            <div key={customField.field} className="flex items-center space-x-2 p-2 border rounded-lg">
              <Checkbox
                id={`field-${customField.field}`}
                checked={isChecked}
                onCheckedChange={() => toggleField(customField.field, customField.label, isRequired, false)}
              />
              <Label htmlFor={`field-${customField.field}`} className="font-normal cursor-pointer flex-1">
                {customField.label}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              {isChecked && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRequired(customField.field)}
                  className="text-xs"
                >
                  {isRequired ? 'Required' : 'Optional'}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCustomField(customField.field)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={newCustomField}
          onChange={(e) => setNewCustomField(e.target.value)}
          placeholder="Enter custom field name..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustomField()
            }
          }}
        />
        <Button type="button" onClick={addCustomField} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Field
        </Button>
      </div>
    </div>
  )
}
