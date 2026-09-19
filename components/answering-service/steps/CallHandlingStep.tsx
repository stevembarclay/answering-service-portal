'use client'
import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Plus, X } from '@phosphor-icons/react'
import { useState } from 'react'
import type { AnsweringServiceSetup } from '@/schemas/answeringServiceSchema'
export function CallHandlingStep() {
  const { watch, setValue } = useFormContext<AnsweringServiceSetup>()
  const defaultAction = (watch('callHandling.defaultAction') as string | undefined) || 'take_message'
  const screeningQuestions = (watch('callHandling.screeningQuestions') as string[] | undefined) || []
  const [newQuestion, setNewQuestion] = useState('')
  const addQuestion = () => {
    if (newQuestion.trim()) {
      setValue('callHandling.screeningQuestions', [...screeningQuestions, newQuestion.trim()])
      setNewQuestion('')
    }
  }
  const removeQuestion = (index: number) => {
    setValue('callHandling.screeningQuestions', screeningQuestions.filter((_, i) => i !== index))
  }
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>How should Answering Service handle incoming calls?</Label>
        <RadioGroup
          value={defaultAction as string}
          onValueChange={(val) => setValue('callHandling.defaultAction', val as 'take_message' | 'patch' | 'screen_and_patch' | 'custom')}
          className="space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="take_message" id="take_message" />
            <Label htmlFor="take_message" className="font-normal">
              Take Message (Record voicemail)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="patch" id="patch" />
            <Label htmlFor="patch" className="font-normal">
              Patch Through (Forward to number)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="screen_and_patch" id="screen_and_patch" />
            <Label htmlFor="screen_and_patch" className="font-normal">
              Screen & Patch (Ask questions, then forward)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="font-normal">
              Custom (Configure later)
            </Label>
          </div>
        </RadioGroup>
      </div>
      {(defaultAction === 'patch' || defaultAction === 'screen_and_patch') && (
        <div className="space-y-2">
          <Label htmlFor="patchNumber">Patch-Through Phone Number</Label>
          <Input
            id="patchNumber"
            type="tel"
            placeholder="+1234567890"
            value={(watch('callHandling.patchNumber') as string | undefined) || ''}
            onChange={(e) => setValue('callHandling.patchNumber', e.target.value)}
          />
        </div>
      )}
      {defaultAction === 'screen_and_patch' && (
        <div className="space-y-4">
          <Label>Screening Questions</Label>
          <div className="space-y-2">
            {screeningQuestions.map((question: string, index: number) => (
              <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                <span className="flex-1 text-sm">{question}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter a screening question..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addQuestion()
                }
              }}
            />
            <Button type="button" onClick={addQuestion} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
