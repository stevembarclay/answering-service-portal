'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { answeringServiceSetupSchema, type AnsweringServiceSetup } from '@/schemas/answeringServiceSchema'
import { PathSelector } from './PathSelector'
import { ProfileStep } from './steps/ProfileStep'
import { GreetingScriptStep } from './steps/GreetingScriptStep'
import { BusinessHoursStep } from './steps/BusinessHoursStep'
import { CallTypesStep } from './steps/CallTypesStep'
import { MessageDeliveryStep } from './steps/MessageDeliveryStep'
import { EscalationRulesStep } from './steps/EscalationRulesStep'
import { BuildSpecOutput } from './BuildSpecOutput'
import { WizardProgress } from './WizardProgress'
import { AIChatStub } from './AIChatStub'
import { CoachPanel } from './CoachPanel'
import { OnboardingBooking } from './OnboardingBooking'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { WizardService } from '@/lib/services/answering-service/wizardService'
import { applyVerticalPresets } from '@/lib/services/answering-service/verticalPresets'
import { CheckCircle } from '@phosphor-icons/react'
import { logger } from '@/lib/utils/logger'
interface SetupWizardClientProps {
  businessId: string
  userId: string
  userRole: string
  userEmail?: string
  initialSession?: {
    id: string
    currentStep: number
    pathSelected: 'self_serve' | 'concierge' | null
    wizardData: Partial<AnsweringServiceSetup>
  } | null
}
const STEPS = [
  { id: 'profile', title: 'Profile', component: ProfileStep },
  { id: 'greeting', title: 'Greeting Script', component: GreetingScriptStep },
  { id: 'hours', title: 'Business Hours', component: BusinessHoursStep },
  { id: 'handling', title: 'Call Types & Handling', component: CallTypesStep },
  { id: 'delivery', title: 'Message Delivery', component: MessageDeliveryStep },
  { id: 'escalation', title: 'Escalation Rules', component: EscalationRulesStep },
]
export function SetupWizardClient({ businessId, userId, userRole, userEmail, initialSession }: SetupWizardClientProps) {
  const [pathSelected, setPathSelected] = useState<'self_serve' | 'concierge' | null>(
    initialSession?.pathSelected || null
  )
  const [currentStep, setCurrentStep] = useState(initialSession?.currentStep || 0)
  const [isComplete, setIsComplete] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(initialSession?.id || null)
  const [isLoadingSession, setIsLoadingSession] = useState(!initialSession)
  const [bookingComplete, setBookingComplete] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const wizardServiceRef = useRef<WizardService | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const defaultValues: AnsweringServiceSetup = initialSession?.wizardData && Object.keys(initialSession.wizardData).length > 0
    ? {
        profile: initialSession.wizardData.profile || { businessName: '', contactName: '', email: userEmail || '', phone: '', industry: '' as AnsweringServiceSetup['profile']['industry'] },
        greeting: initialSession.wizardData.greeting || { template: '', presentAs: 'answering_service', language: 'english' },
        businessHours: initialSession.wizardData.businessHours || { type: '24_7', timezone: 'America/New_York' },
        callTypes: initialSession.wizardData.callTypes || [],
        callHandling: initialSession.wizardData.callHandling || { defaultAction: 'take_message', patchNumber: '', screeningQuestions: [] },
        messageDelivery: initialSession.wizardData.messageDelivery || { globalDefaults: { channels: ['email'], urgentSmsEnabled: false } },
        escalation: initialSession.wizardData.escalation || { enabled: false },
        billingConfirm: initialSession.wizardData.billingConfirm || { planTier: '', confirmedTerms: false }
      }
    : {
        profile: { businessName: '', contactName: '', email: userEmail || '', phone: '', industry: '' as AnsweringServiceSetup['profile']['industry'] },
        greeting: { template: '', presentAs: 'answering_service', language: 'english' },
        businessHours: { type: '24_7', timezone: 'America/New_York' },
        callTypes: [],
        callHandling: { defaultAction: 'take_message', patchNumber: '', screeningQuestions: [] },
        messageDelivery: { globalDefaults: { channels: ['email'], urgentSmsEnabled: false } },
        escalation: { enabled: false },
        billingConfirm: { planTier: '', confirmedTerms: false }
      }
  const methods = useForm<AnsweringServiceSetup>({
    resolver: zodResolver(answeringServiceSetupSchema),
    defaultValues,
    mode: 'onChange'
  })
  // Initialize wizard service
  useEffect(() => {
    const supabase = createClient()
    wizardServiceRef.current = new WizardService(supabase)
    // If no initial session, fetch or create one
    if (!initialSession && !sessionId) {
      wizardServiceRef.current
        .getOrCreateSession(businessId, userId)
        .then((session) => {
          setSessionId(session.id)
          setPathSelected(session.path_selected)
          setCurrentStep(session.current_step)
          if (session.wizard_data && Object.keys(session.wizard_data).length > 0) {
            // Merge session data with defaults
            const mergedData: AnsweringServiceSetup = {
              profile: session.wizard_data.profile || defaultValues.profile,
              greeting: session.wizard_data.greeting || defaultValues.greeting,
              businessHours: session.wizard_data.businessHours || defaultValues.businessHours,
              callTypes: session.wizard_data.callTypes || defaultValues.callTypes,
              callHandling: session.wizard_data.callHandling || defaultValues.callHandling,
              messageDelivery: session.wizard_data.messageDelivery || defaultValues.messageDelivery,
              escalation: session.wizard_data.escalation || defaultValues.escalation,
              billingConfirm: session.wizard_data.billingConfirm || defaultValues.billingConfirm
            }
            methods.reset(mergedData)
          }
          setIsLoadingSession(false)
        })
        .catch((error: unknown) => {
          logger.error('[SetupWizardClient] Error fetching session:', error)
          setIsLoadingSession(false)
        })
    } else {
      setIsLoadingSession(false)
    }
  }, [businessId, userId, initialSession, sessionId, methods, defaultValues])
  // Debounced session update
  const updateSession = useCallback(
    async (updates: { currentStep?: number; wizardData?: Partial<AnsweringServiceSetup>; pathSelected?: 'self_serve' | 'concierge' | null; status?: 'in_progress' | 'completed' }) => {
      if (!sessionId || !wizardServiceRef.current) return
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      // Set new timer (300ms debounce)
      debounceTimerRef.current = setTimeout(async () => {
        try {
          await wizardServiceRef.current!.updateSession(sessionId, updates)
        } catch (error: unknown) {
          logger.error('[SetupWizardClient] Error updating session:', error)
        }
      }, 300)
    },
    [sessionId]
  )
  // Update session on form changes (debounced)
  useEffect(() => {
    if (!sessionId) return
    const subscription = methods.watch(() => {
      const formData = methods.getValues()
      updateSession({ wizardData: formData })
    })
    return () => subscription.unsubscribe()
  }, [methods, sessionId, updateSession])
  // Update session on step change
  useEffect(() => {
    if (sessionId && pathSelected) {
      updateSession({ currentStep })
    }
  }, [currentStep, sessionId, pathSelected, updateSession])
  // Update session on path selection
  useEffect(() => {
    if (sessionId) {
      updateSession({ pathSelected })
    }
  }, [pathSelected, sessionId, updateSession])
  // Loading state
  if (isLoadingSession) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading your session...</p>
        </CardContent>
      </Card>
    )
  }
  // Path selection screen
  if (!pathSelected) {
    return (
      <>
        <div className="flex gap-6">
          <div className="flex-1">
            <PathSelector onSelect={setPathSelected} />
          </div>
          <div className="hidden lg:block">
            <CoachPanel 
              currentStep={0}
              stepName={STEPS[0]?.title || 'Setup'}
              industry={(methods.watch('profile.industry') as string | undefined) || null}
              businessName={(methods.watch('profile.businessName') as string | undefined) || null}
              formData={methods.getValues()}
            />
          </div>
        </div>
        <div className="lg:hidden">
          <AIChatStub />
        </div>
      </>
    )
  }
  // Concierge path — show Cal.com embed or confirmation
  if (pathSelected === 'concierge') {
    return (
      <>
        <div className="flex gap-6">
          <div className="flex-1">
            {bookingComplete ? (
              <Card className="min-h-[600px]">
                <CardContent className="pt-6">
                  <div className="text-center space-y-6">
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="h-8 w-8" />
                      <h2 className="text-2xl font-semibold">You're Booked!</h2>
                    </div>
                    <p className="text-muted-foreground">
                      We'll walk through your account setup together on the call.
                      You'll receive a calendar invite and reminder email.
                    </p>
                    <Button variant="default" onClick={() => router.push('/answering-service/dashboard')} size="lg">
                      Go to Dashboard
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Want to get a head start?{' '}
                      <button 
                        onClick={() => { setPathSelected('self_serve'); setCurrentStep(0); }}
                        className="text-primary underline"
                      >
                        Start Self-Serve Setup
                      </button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="min-h-[600px]">
                <CardHeader>
                  <CardTitle>Schedule Your Onboarding Call</CardTitle>
                  <CardDescription>
                    Pick a time that works for you. One of our specialists will guide you through setup.
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[500px]">
                  <OnboardingBooking 
                    businessId={businessId} 
                    onBookingComplete={() => setBookingComplete(true)}
                  />
                </CardContent>
                <div className="px-6 pb-6">
                  <Button 
                    variant="ghost" 
                    onClick={() => setPathSelected(null)}
                  >
                    ← Back to path selection
                  </Button>
                </div>
              </Card>
            )}
          </div>
          <div className="hidden lg:block">
            <CoachPanel 
              currentStep={0}
              stepName={STEPS[0]?.title || 'Setup'}
              industry={(methods.watch('profile.industry') as string | undefined) || null}
              businessName={(methods.watch('profile.businessName') as string | undefined) || null}
              formData={methods.getValues()}
            />
          </div>
        </div>
        <div className="lg:hidden">
          <AIChatStub />
        </div>
      </>
    )
  }
  // Wizard complete — show build spec
  if (isComplete) {
    return (
      <>
        <div className="flex gap-6">
          <div className="flex-1">
            <BuildSpecOutput data={methods.getValues()} businessId={businessId} />
          </div>
          <div className="hidden lg:block">
            <CoachPanel 
              currentStep={STEPS.length}
              stepName="Build Spec"
              industry={(methods.watch('profile.industry') as string | undefined) || null}
              businessName={(methods.watch('profile.businessName') as string | undefined) || null}
              formData={methods.getValues()}
            />
          </div>
        </div>
        <div className="lg:hidden">
          <AIChatStub />
        </div>
      </>
    )
  }
  // Self-serve wizard
  const CurrentStepComponent = STEPS[currentStep].component
  const stepProps = currentStep === 0 ? { userEmail } : {}
  const handleNext = async () => {
    // Validate current step before proceeding
    const stepFields = getStepFields(currentStep)
    logger.info('[SetupWizardClient] Validating fields:', stepFields)
    logger.info('[SetupWizardClient] Current step:', currentStep, STEPS[currentStep]?.title)
    // SAFETY: react-hook-form trigger() accepts string[] but its generic type requires exact field paths
    const isValid = await methods.trigger(stepFields as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    logger.info('[SetupWizardClient] Validation result:', isValid)
    logger.info('[SetupWizardClient] Form errors:', methods.formState.errors)
    logger.info('[SetupWizardClient] Current form values:', methods.getValues())
    if (!isValid) {
      // Find first error field and focus it
      // Use setTimeout to ensure DOM has updated with error states
      setTimeout(() => {
        const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement
        if (firstErrorField) {
          firstErrorField.focus()
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      toast({
        title: 'Please complete all required fields',
        description: 'Check the highlighted fields above',
        variant: 'destructive',
      })
      logger.error('[SetupWizardClient] Validation failed - cannot proceed to next step')
      return
    }
    // Pre-populate Steps 1–5 with vertical defaults on first advance past Step 0
    if (currentStep === 0) {
      const industry = methods.getValues('profile.industry')
      if (!industry) return // narrows '' away for TypeScript; unreachable at runtime (validation just passed)
      const presets = applyVerticalPresets(industry, methods.getValues())
      if (presets) {
        methods.setValue('greeting', presets.greeting)
        methods.setValue('businessHours', presets.businessHours)
        methods.setValue('callTypes', presets.callTypes)
        methods.setValue('messageDelivery', presets.messageDelivery)
        methods.setValue('escalation', presets.escalation)
        toast({
          title: 'Defaults pre-filled',
          description: "We've applied industry defaults — customize them as you go.",
        })
      }
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete the session
      if (sessionId && wizardServiceRef.current) {
        try {
          await wizardServiceRef.current.completeSession(sessionId)
        } catch (error: unknown) {
          logger.error('[SetupWizardClient] Error completing session:', error)
        }
      }
      setIsComplete(true)
    }
  }
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else {
      setPathSelected(null)
    }
  }
  return (
    <FormProvider {...methods}>
      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          <WizardProgress 
            steps={STEPS.map(s => s.title)} 
            currentStep={currentStep} 
          />
          <Card>
            <CardHeader>
              <CardTitle>{STEPS[currentStep].title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CurrentStepComponent {...stepProps} />
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              {currentStep === 0 ? '← Change Path' : '← Back'}
            </Button>
            <Button variant="default" onClick={handleNext}>
              {currentStep === STEPS.length - 1 ? 'Generate Build Spec' : 'Next →'}
            </Button>
          </div>
        </div>
        <div className="hidden lg:block">
          <CoachPanel 
            currentStep={currentStep}
            stepName={STEPS[currentStep]?.title || 'Setup'}
            industry={(methods.watch('profile.industry') as string | undefined) || null}
            businessName={(methods.watch('profile.businessName') as string | undefined) || null}
            formData={methods.getValues()}
          />
        </div>
      </div>
      <div className="lg:hidden">
        <AIChatStub />
      </div>
    </FormProvider>
  )
}
/**
 * Get field paths for validation trigger based on step
 * Returns nested field paths that react-hook-form trigger() expects
 * 
 * Note: For steps with schema-level refinements (profile, messageDelivery, escalation),
 * we trigger on the parent object to ensure refinements are validated.
 */
function getStepFields(step: number): string[] {
  switch (step) {
    case 0: // Profile (has refine for industry)
      // Trigger on parent to validate refine, or individual fields
      return [
        'profile.businessName',
        'profile.contactName',
        'profile.email',
        'profile.industry',
        'profile' // Parent to trigger refine validation
      ]
    case 1: // Greeting Script
      return [
        'greeting.template',
        'greeting.presentAs'
      ]
    case 2: // Business Hours
      return [
        'businessHours.type',
        'businessHours.timezone'
      ]
    case 3: // Call Types
      // Validate the callTypes array itself
      // The schema requires at least one call type, and each call type has required fields
      return ['callTypes']
    case 4: // Message Delivery (has refines for conditional emailAddress/smsNumber)
      // Trigger on parent to validate schema-level refinements
      return [
        'messageDelivery.globalDefaults.channels',
        'messageDelivery.globalDefaults.emailAddress',
        'messageDelivery.globalDefaults.smsNumber',
        'messageDelivery' // Parent to trigger refine validation
      ]
    case 5: // Escalation Rules (has refines for conditional globalEscalationContact)
      // Trigger on parent to validate schema-level refinements
      return [
        'escalation.enabled',
        'escalation.globalEscalationContact',
        'escalation' // Parent to trigger refine validation
      ]
    default:
      return []
  }
}
