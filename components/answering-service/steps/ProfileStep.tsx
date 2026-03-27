'use client'

import { useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormDescription } from '@/components/ui/form-description'
import type { AnsweringServiceSetup } from '@/schemas/answeringServiceSchema'

interface ProfileStepProps {
  userEmail?: string
}

export function ProfileStep({ userEmail }: ProfileStepProps) {
  const { watch, setValue, formState: { errors } } = useFormContext<AnsweringServiceSetup>()
  const industry = watch('profile.industry')

  // Pre-fill email from auth if available
  useEffect(() => {
    if (userEmail && !watch('profile.email')) {
      setValue('profile.email', userEmail)
    }
  }, [userEmail, setValue]) // eslint-disable-line react-hooks/exhaustive-deps

  // Industry-specific examples for helper text
  const industryExample = useMemo(() => {
    switch (industry) {
      case 'legal':
        return 'For example, common call types might include "New Client Inquiry" or "Opposing Counsel" which we\'ll set up in the next steps.'
      case 'medical':
        return 'For example, common call types might include "New Patient Appointment" or "Urgent Medical Concern" which we\'ll set up in the next steps.'
      case 'home_services':
        return 'For example, common call types might include "Service Request" or "Emergency Service" which we\'ll set up in the next steps.'
      default:
        return 'We\'ll use this to pre-populate relevant call types and customize guidance for your industry in the next steps.'
    }
  }, [industry])

  return (
    <div className="space-y-6">
      <FormDescription>
        Tell us about your business so we can customize the setup experience. Your industry selection pre-populates call types and customizes guidance throughout the wizard. {industry ? industryExample : 'Choose your industry to see tailored examples and suggestions.'}
      </FormDescription>
      <div className="space-y-2">
        <Label htmlFor="businessName">
          Business Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="businessName"
          placeholder="Your Business Name"
          value={watch('profile.businessName') || ''}
          onChange={(e) => setValue('profile.businessName', e.target.value)}
          className={errors.profile?.businessName ? 'border-destructive' : ''}
          aria-invalid={errors.profile?.businessName ? 'true' : 'false'}
        />
        {errors.profile?.businessName && (
          <p className="text-sm text-destructive">{errors.profile.businessName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactName">
          Contact Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="contactName"
          placeholder="Your Name"
          value={watch('profile.contactName') || ''}
          onChange={(e) => setValue('profile.contactName', e.target.value)}
          className={errors.profile?.contactName ? 'border-destructive' : ''}
          aria-invalid={errors.profile?.contactName ? 'true' : 'false'}
        />
        {errors.profile?.contactName && (
          <p className="text-sm text-destructive">{errors.profile.contactName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={watch('profile.email') || ''}
          onChange={(e) => setValue('profile.email', e.target.value)}
          className={errors.profile?.email ? 'border-destructive' : ''}
          aria-invalid={errors.profile?.email ? 'true' : 'false'}
        />
        {errors.profile?.email && (
          <p className="text-sm text-destructive">{errors.profile.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1234567890"
          value={watch('profile.phone') || ''}
          onChange={(e) => setValue('profile.phone', e.target.value)}
        />
        <FormDescription>
          Optional. If provided, you can use SMS magic link authentication for faster login to your Answering Service portal.
        </FormDescription>
      </div>

      <div className="space-y-2">
        <Label htmlFor="industry">
          Industry <span className="text-destructive">*</span>
        </Label>
        <Select
          value={watch('profile.industry') || ''}
          onValueChange={(val: string) => setValue('profile.industry', val as AnsweringServiceSetup['profile']['industry'])}
        >
          <SelectTrigger 
            className={errors.profile?.industry ? 'border-destructive' : ''}
            aria-invalid={errors.profile?.industry ? 'true' : 'false'}
          >
            <SelectValue placeholder="Choose one..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="legal">Legal (Attorney, Law Firm)</SelectItem>
            <SelectItem value="medical">Medical (Doctor, Dentist, Healthcare)</SelectItem>
            <SelectItem value="home_services">Home Services (HVAC, Plumbing, Electrical, Contractor)</SelectItem>
            <SelectItem value="real_estate">Real Estate (Agent, Property Management)</SelectItem>
            <SelectItem value="professional_services">Professional Services (Accounting, Consulting, Financial)</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors.profile?.industry && (
          <p className="text-sm text-destructive">{errors.profile.industry.message}</p>
        )}
        <FormDescription>
          Your industry selection helps us suggest relevant call types and customize guidance throughout the setup process.
        </FormDescription>
      </div>
    </div>
  )
}

