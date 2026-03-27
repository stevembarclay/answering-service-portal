'use client'
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Plus, X } from '@phosphor-icons/react'
import type { CallHandlingConfig as CallHandlingConfigType } from '@/schemas/answeringServiceSchema'
import { InfoFieldsSelector } from './InfoFieldsSelector'
interface CallHandlingConfigProps {
  title: string
  value: CallHandlingConfigType | undefined
  onChange: (config: CallHandlingConfigType | undefined) => void
}
export function CallHandlingConfig({ title, value, onChange }: CallHandlingConfigProps) {
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>(
    value?.screeningQuestions || []
  )
  const [newQuestion, setNewQuestion] = useState('')
  const action = value?.action || 'take_message'
  const patchTo = value?.patchTo || ''
  const handleActionChange = (newAction: CallHandlingConfigType['action']) => {
    const newConfig: CallHandlingConfigType = {
      action: newAction,
      patchTo: newAction === 'patch' || newAction === 'screen_and_patch' ? patchTo : undefined,
      screeningQuestions: newAction === 'screen_and_patch' ? screeningQuestions : undefined,
      infoToCollect: value?.infoToCollect,
    }
    onChange(newConfig)
  }
  const handlePatchToChange = (newPatchTo: string) => {
    if (value) {
      onChange({ ...value, patchTo: newPatchTo || undefined })
    }
  }
  const addScreeningQuestion = () => {
    if (newQuestion.trim()) {
      const updatedQuestions = [...screeningQuestions, newQuestion.trim()]
      setScreeningQuestions(updatedQuestions)
      if (value) {
        onChange({ ...value, screeningQuestions: updatedQuestions })
      }
      setNewQuestion('')
    }
  }
  const removeScreeningQuestion = (index: number) => {
    const updatedQuestions = screeningQuestions.filter((_, i) => i !== index)
    setScreeningQuestions(updatedQuestions)
    if (value) {
      onChange({ ...value, screeningQuestions: updatedQuestions.length > 0 ? updatedQuestions : undefined })
    }
  }
  const handleInfoToCollectChange = (fields: CallHandlingConfigType['infoToCollect']) => {
    if (value) {
      onChange({ ...value, infoToCollect: fields })
    }
  }
  return (
    <div className="space-y-6 p-4 border rounded-lg bg-muted/30">
      <h4 className="font-semibold text-sm">{title}</h4>
      <div className="space-y-3">
        <Label>Action</Label>
        <RadioGroup
          value={action}
          onValueChange={(val) => handleActionChange(val as CallHandlingConfigType['action'])}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="take_message" id={`${title}-take_message`} />
            <Label htmlFor={`${title}-take_message`} className="font-normal">
              Take Message
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="patch" id={`${title}-patch`} />
            <Label htmlFor={`${title}-patch`} className="font-normal">
              Patch to
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="screen_and_patch" id={`${title}-screen_and_patch`} />
            <Label htmlFor={`${title}-screen_and_patch`} className="font-normal">
              Screen, then Patch to
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id={`${title}-custom`} />
            <Label htmlFor={`${title}-custom`} className="font-normal">
              Custom Script
            </Label>
          </div>
        </RadioGroup>
      </div>
      {(action === 'patch' || action === 'screen_and_patch') && (
        <div className="space-y-2">
          <Label htmlFor={`${title}-patchTo`}>Phone Number</Label>
          <Input
            id={`${title}-patchTo`}
            type="tel"
            placeholder="+1234567890"
            value={patchTo}
            onChange={(e) => handlePatchToChange(e.target.value)}
          />
        </div>
      )}
      {action === 'screen_and_patch' && (
        <div className="space-y-4">
          <Label>Screening Questions</Label>
          <div className="space-y-2">
            {screeningQuestions.map((question, index) => (
              <div key={index} className="flex items-center gap-2 p-2 border rounded-lg bg-background">
                <span className="flex-1 text-sm">{question}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeScreeningQuestion(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter a screening question..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault()
                  addScreeningQuestion()
                }
              }}
            />
            <Button type="button" onClick={addScreeningQuestion} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      )}
      {action === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor={`${title}-customScript`}>Custom Script</Label>
          <Textarea
            id={`${title}-customScript`}
            placeholder="Enter your custom handling script..."
            rows={4}
          />
        </div>
      )}
      <InfoFieldsSelector
        value={value?.infoToCollect}
        onChange={handleInfoToCollectChange}
      />
    </div>
  )
}
