'use client'

import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { FormDescription } from '@/components/ui/form-description'
import type { AnsweringServiceSetup } from '@/schemas/answeringServiceSchema'
import { getIndustryGreetingTemplates } from '@/lib/services/answering-service/verticalPresets'

/**
 * Interpolates template text with actual values
 */
function interpolateTemplate(template: string, businessName: string): string {
  return template
    .replace(/\{business_name\}/g, businessName || '{business_name}')
    .replace(/\[morning\/afternoon\]/g, 'morning')
    // Leave [agent name] as-is in preview - it will be replaced with actual agent name at runtime
}

export function GreetingScriptStep() {
  const { watch, setValue, formState: { errors } } = useFormContext<AnsweringServiceSetup>()
  
  // Read form values
  const profileBusinessName = watch('profile.businessName') || ''
  const profileIndustry = watch('profile.industry')
  const greetingTemplate = watch('greeting.template') || ''
  const greetingCustomScript = watch('greeting.customScript') || ''
  const greetingPresentAs = watch('greeting.presentAs') || 'employee'
  const greetingLanguage = watch('greeting.language') || 'english'

  // Build available templates based on industry
  const availableTemplates = useMemo(
    () => getIndustryGreetingTemplates(profileIndustry),
    [profileIndustry],
  )

  // Get preview text
  const previewText = useMemo(() => {
    if (greetingTemplate === 'custom') {
      return greetingCustomScript || ''
    }
    
    const selectedTemplate = availableTemplates.find(t => t.id === greetingTemplate)
    if (!selectedTemplate) return ''
    
    return interpolateTemplate(selectedTemplate.text, profileBusinessName)
  }, [greetingTemplate, greetingCustomScript, availableTemplates, profileBusinessName])

  // Get presentation style label
  const presentationLabel = useMemo(() => {
    if (!profileBusinessName) return 'Answer as an employee'
    return greetingPresentAs === 'employee'
      ? `Answer as an employee of ${profileBusinessName}`
      : `Answer as ${profileBusinessName}'s answering service`
  }, [greetingPresentAs, profileBusinessName])

  return (
    <div className="space-y-6">
      <FormDescription>
        Configure how Answering Service agents will greet callers. This is the first impression callers get, so choose a presentation style that matches how you want your business represented. The greeting sets the tone for the entire call experience.
      </FormDescription>

      {/* Language Preference */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>
            Language Preference <span className="text-destructive">*</span>
          </Label>
          <FormDescription>
            Select the primary language for your calls. Bilingual agents can switch between English and Spanish as needed. This affects agent assignment—we'll route calls to agents fluent in your selected language.
          </FormDescription>
        </div>
        <RadioGroup
          value={greetingLanguage}
          onValueChange={(val: string) => setValue('greeting.language', val as 'english' | 'bilingual' | 'spanish')}
          className="space-y-2"
          aria-invalid={errors.greeting?.language ? 'true' : 'false'}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="english" id="lang-english" />
            <Label htmlFor="lang-english" className="font-normal cursor-pointer">
              Primarily English
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="bilingual" id="lang-bilingual" />
            <Label htmlFor="lang-bilingual" className="font-normal cursor-pointer">
              English & Spanish (Bilingual)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="spanish" id="lang-spanish" />
            <Label htmlFor="lang-spanish" className="font-normal cursor-pointer">
              Primarily Spanish
            </Label>
          </div>
        </RadioGroup>
        {errors.greeting?.language && (
          <p className="text-sm text-destructive">
            {errors.greeting.language.message}
          </p>
        )}
      </div>

      {/* Presentation Style Toggle */}
      <div className="space-y-3">
        <Label>How should the agent present themselves?</Label>
        <FormDescription>
          <strong>Employee:</strong> Agents identify as working directly for your business (e.g., "Hello, this is [agent name] from {profileBusinessName || 'your business'}"). <strong>Answering Service:</strong> Agents identify as an external service handling calls on your behalf (e.g., "Hello, this is [agent name] with {profileBusinessName || 'your business'}'s answering service"). Choose based on how transparent you want to be about using a service.
        </FormDescription>
        <RadioGroup
          value={greetingPresentAs}
          onValueChange={(val: string) => setValue('greeting.presentAs', val as 'employee' | 'answering_service')}
          className="space-y-2"
          aria-invalid={errors.greeting?.presentAs ? 'true' : 'false'}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="employee" id="present-as-employee" />
            <Label htmlFor="present-as-employee" className="font-normal cursor-pointer">
              Answer as an employee of {profileBusinessName || '{businessName}'}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="answering_service" id="present-as-service" />
            <Label htmlFor="present-as-service" className="font-normal cursor-pointer">
              Answer as {profileBusinessName || '{businessName}'}'s answering service
            </Label>
          </div>
        </RadioGroup>
        {errors.greeting?.presentAs && (
          <p className="text-sm text-destructive">
            {errors.greeting.presentAs.message}
          </p>
        )}
      </div>

      {/* Greeting Template Selector */}
      <div className="space-y-2">
        <Label htmlFor="greeting-template">Greeting Template</Label>
        <FormDescription>
          Choose a pre-written greeting or create a custom one. Templates are customized based on your industry—legal practices see legal-specific options, medical practices see medical-specific options. The preview shows exactly what callers will hear.
        </FormDescription>
        <Select
          value={greetingTemplate}
          onValueChange={(val: string) => {
            setValue('greeting.template', val)
            if (val !== 'custom') {
              setValue('greeting.customScript', '')
            }
          }}
        >
          <SelectTrigger 
            id="greeting-template"
            className={errors.greeting?.template ? 'border-destructive' : ''}
            aria-invalid={errors.greeting?.template ? 'true' : 'false'}
          >
            <SelectValue placeholder="Select a greeting template" />
          </SelectTrigger>
          <SelectContent>
            {availableTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.text.replace(/\{business_name\}/g, profileBusinessName || '{business_name}')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.greeting?.template && (
          <p className="text-sm text-destructive">
            {errors.greeting.template.message}
          </p>
        )}
      </div>

      {/* Custom Script Input (shown when Custom is selected) */}
      {greetingTemplate === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="custom-script">
            Custom Greeting <span className="text-muted-foreground">(max 500 characters)</span>
          </Label>
          <Textarea
            id="custom-script"
            placeholder="Enter your custom greeting script..."
            rows={4}
            maxLength={500}
            value={greetingCustomScript}
            onChange={(e) => setValue('greeting.customScript', e.target.value)}
            className={errors.greeting?.customScript ? 'border-destructive' : ''}
            aria-invalid={errors.greeting?.customScript ? 'true' : 'false'}
          />
          <div className="flex justify-end">
            <p className="text-xs text-muted-foreground">
              {greetingCustomScript.length} / 500
            </p>
          </div>
          {errors.greeting?.customScript && (
            <p className="text-sm text-destructive">
              {errors.greeting.customScript.message}
            </p>
          )}
        </div>
      )}

      {/* Live Preview */}
      <div className="space-y-2">
        <Label>Preview</Label>
        <Card className="bg-muted/50 border-muted">
          <CardContent className="pt-6">
            <div className="relative">
              <div className="absolute -top-2 left-4 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-muted/50"></div>
              <p className="text-sm italic text-foreground">
                {previewText || (
                  <span className="text-muted-foreground">Select a template to see preview</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
        {previewText && previewText.includes('[agent name]') && (
          <p className="text-xs text-muted-foreground">
            [agent name] will be replaced with the answering agent's actual name.
          </p>
        )}
      </div>
    </div>
  )
}
