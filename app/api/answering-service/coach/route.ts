import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import { getBusinessContext } from '@/lib/auth/server'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import { rateLimitAsync, createRateLimitResponse } from '@/lib/middleware/rateLimit'
import { createModuleLogger } from '@/lib/utils/logger'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { getCorsHeaders, getCorsPreflightHeaders } from '@/lib/utils/cors'
import { loadPrompt, interpolatePrompt } from '@/lib/utils/promptLoader'
const logger = createModuleLogger('API')

// Runtime configuration (nodejs runtime for consistency with other AI routes)
export const runtime = 'nodejs'

/**
 * Zod schema for coach request validation
 */
const CoachRequestSchema = z.object({
  message: z.string().min(1, 'message is required'),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).default([]),
  wizardContext: z.object({
    currentStep: z.number().min(0).max(10),
    stepName: z.string().min(1, 'stepName is required'),
    industry: z.string().optional(),
    businessName: z.string().optional(),
    formData: z.record(z.unknown()).optional(),
  }),
})

/**
 * Step-specific guidance based on the current step name.
 * Helps the AI give focused, relevant advice for each wizard step.
 */
function buildStepGuidance(stepName: string, currentStep: number): string {
  const stepNameLower = stepName.toLowerCase()

  if (stepNameLower.includes('business') && (stepNameLower.includes('info') || stepNameLower.includes('detail') || currentStep === 0)) {
    return 'The customer is setting up their basic business info. Help them understand why each field matters — industry affects call handling recommendations, and their business name appears in operator scripts.'
  }
  if (stepNameLower.includes('call') && stepNameLower.includes('handling') || stepNameLower.includes('handling')) {
    return 'The customer is choosing how calls get handled. Key options are: patch through (direct transfer), take message (collect and send), or screen and patch (qualify first). Guide them toward the right fit for their business type and urgency level.'
  }
  if (stepNameLower.includes('hour') || stepNameLower.includes('schedule') || stepNameLower.includes('hours')) {
    return 'The customer is setting their business hours. This determines what counts as "during business hours" vs "after hours." Encourage them to include holidays and lunch breaks if relevant. Time zones matter — make sure they pick the right one.'
  }
  if (stepNameLower.includes('after') || stepNameLower.includes('overnight')) {
    return 'The customer is configuring after-hours call handling. This is often the most important setup for businesses that get urgent calls outside office hours. Help them think through: what counts as an emergency? Who should be reached? What can wait until morning?'
  }
  if (stepNameLower.includes('escalation') || stepNameLower.includes('contact') || stepNameLower.includes('on-call') || stepNameLower.includes('oncall')) {
    return 'The customer is adding escalation contacts — people who get called or texted when something urgent comes in. Help them think about: primary vs backup contacts, what method works best (call, text, email), and whether they want a rotating on-call schedule.'
  }
  if (stepNameLower.includes('instruction') || stepNameLower.includes('script') || stepNameLower.includes('message') || stepNameLower.includes('template')) {
    return 'The customer is writing custom instructions or message templates. Encourage them to be specific about what information to collect from callers, any phrases to avoid, and how to handle callers who are upset or in an emergency.'
  }
  if (stepNameLower.includes('review') || stepNameLower.includes('confirm') || stepNameLower.includes('submit') || stepNameLower.includes('finish')) {
    return 'The customer is on the final review step. Help them feel confident about what they\'ve set up. If they have last-minute questions about any configuration, reassure them that changes can be made after launch.'
  }

  // Generic fallback based on step number
  const stepDescriptions: Record<number, string> = {
    0: 'The customer is setting up their basic business information.',
    1: 'The customer is configuring call handling preferences.',
    2: 'The customer is setting their business hours.',
    3: 'The customer is configuring after-hours call handling.',
    4: 'The customer is adding escalation contacts.',
    5: 'The customer is writing custom instructions or message templates.',
    6: 'The customer is reviewing and finalizing their setup.',
  }
  return stepDescriptions[currentStep] ?? `The customer is on step ${currentStep + 1}: ${stepName}.`
}

/**
 * Builds a human-readable summary of the form data the customer has filled in.
 * Only includes fields that are non-empty and meaningful.
 */
function buildFormSnapshot(formData: Record<string, unknown> | undefined): string {
  if (!formData || Object.keys(formData).length === 0) {
    return 'Nothing filled in yet on this step.'
  }

  const lines: string[] = []

  // Extract and format known fields
  const fieldFormatters: Array<{ keys: string[]; label: string; format?: (v: unknown) => string }> = [
    { keys: ['businessName', 'business_name'], label: 'Business name' },
    { keys: ['industry'], label: 'Industry' },
    { keys: ['callHandling', 'call_handling', 'primaryCallType', 'primary_call_type'], label: 'Primary call handling' },
    { keys: ['afterHoursHandling', 'after_hours_handling', 'afterHoursType', 'after_hours_type'], label: 'After-hours handling' },
    { keys: ['timezone'], label: 'Timezone' },
    { keys: ['greetingMessage', 'greeting_message', 'greeting'], label: 'Greeting message' },
    { keys: ['specialInstructions', 'special_instructions', 'instructions'], label: 'Special instructions' },
  ]

  for (const { keys, label, format } of fieldFormatters) {
    for (const key of keys) {
      const value = formData[key]
      if (value !== undefined && value !== null && value !== '') {
        const displayValue = format ? format(value) : String(value)
        lines.push(`- ${label}: ${displayValue}`)
        break
      }
    }
  }

  // Call types selected (array field)
  const callTypes = formData['callTypes'] ?? formData['call_types'] ?? formData['selectedCallTypes']
  if (Array.isArray(callTypes) && callTypes.length > 0) {
    lines.push(`- Call types selected: ${callTypes.join(', ')}`)
  }

  // Escalation contacts (array field)
  const contacts = formData['escalationContacts'] ?? formData['escalation_contacts'] ?? formData['contacts']
  if (Array.isArray(contacts) && contacts.length > 0) {
    lines.push(`- Escalation contacts added: ${contacts.length}`)
  }

  // Business hours (if present, just note it's set)
  const hours = formData['businessHours'] ?? formData['business_hours'] ?? formData['hours']
  if (hours !== undefined && hours !== null) {
    lines.push('- Business hours: configured')
  }

  // On-call schedule
  const onCall = formData['onCallSchedule'] ?? formData['on_call_schedule'] ?? formData['shifts']
  if (Array.isArray(onCall) && onCall.length > 0) {
    lines.push(`- On-call shifts configured: ${onCall.length}`)
  } else if (onCall !== undefined && onCall !== null) {
    lines.push('- On-call schedule: configured')
  }

  if (lines.length === 0) {
    return 'Some fields have been filled in but no key details are available to summarize.'
  }

  return lines.join('\n')
}

/**
 * POST /api/answering-service/coach
 *
 * AI Coach API route for Answering Service setup wizard guidance
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check - must be authenticated to use AI Coach
    const context = await getBusinessContext()
    if (!context) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await checkModuleAccessOrThrow('answering_service')
    // Rate limiting
    const rateLimitId = context.businessId || 'anonymous'
    const rateLimitResult = await rateLimitAsync(rateLimitId)
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      logger.error('[Answering Service Coach API] Missing OPENAI_API_KEY environment variable')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch (error) {
      logger.error('[Answering Service Coach API] Invalid JSON in request body:', error)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate request schema
    const validationResult = CoachRequestSchema.safeParse(body)
    if (!validationResult.success) {
      logger.error('[Answering Service Coach API] Validation error:', validationResult.error)
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const { message, conversationHistory, wizardContext } = validationResult.data

    // Log request (first 100 chars only)
    const preview = message.length > 100
      ? `${message.substring(0, 100)}...`
      : message
    logger.info(`[Answering Service Coach API] Message for step ${wizardContext.currentStep + 1} (${wizardContext.stepName}): ${preview}`)

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey,
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    })

    // Build formSnapshot and stepGuidance from wizard context
    const formSnapshot = buildFormSnapshot(wizardContext.formData)
    const stepGuidance = buildStepGuidance(wizardContext.stepName, wizardContext.currentStep)

    // Build interpolation vars from env + request context
    const promptVars: Record<string, string> = {
      serviceName: process.env.PORTAL_NAME ?? 'Answering Service',
      serviceDesc: process.env.AI_SERVICE_DESCRIPTION ?? 'answering service',
      stepName: wizardContext.stepName,
      currentStep: String(wizardContext.currentStep + 1),
      totalSteps: '7',
      industry: wizardContext.industry ?? 'Not yet selected',
      businessName: wizardContext.businessName ?? 'Not yet provided',
      formSnapshot,
      stepGuidance,
    }

    // Load prompt from file (operators can edit prompts/wizard-coach.md to customise).
    // Falls back to the inline default if the file is missing.
    const FALLBACK_PROMPT = `You are an onboarding coach for {{serviceName}}, a {{serviceDesc}}. You're helping a customer configure their account through a setup wizard.

CURRENT CONTEXT:
- Step: {{stepName}} ({{currentStep}} of {{totalSteps}})
- Industry: {{industry}}
- Business: {{businessName}}

WHAT THE CUSTOMER HAS FILLED IN SO FAR:
{{formSnapshot}}

GUIDANCE FOR THIS STEP:
{{stepGuidance}}

YOUR ROLE:
- Answer questions about the current step
- Explain answering service concepts in plain language
- Give industry-specific advice when relevant
- Keep responses concise (2-3 sentences unless they ask for detail)
- Never make changes to their account - only advise

Be helpful, professional, and conversational. If they ask something outside your scope, say so politely.`

    const systemPrompt = interpolatePrompt(loadPrompt('wizard-coach.md') ?? FALLBACK_PROMPT, promptVars)

    // Build conversation messages from history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ]

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    })

    // Call OpenAI API
    let completion
    try {
      completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.7,
        messages,
        max_tokens: 500, // Keep responses concise
      })
    } catch (error) {
      // Handle OpenAI API errors
      if (error instanceof OpenAI.APIError) {
        logger.error('[Answering Service Coach API] OpenAI API error:', {
          status: error.status,
          code: error.code,
          message: error.message,
        })

        // Handle rate limits
        if (error.status === 429) {
          return NextResponse.json(
            {
              error: 'Rate limit exceeded',
              message: 'Too many requests. Please try again later.',
            },
            { status: 429 }
          )
        }

        // Handle other API errors
        return NextResponse.json(
          {
            error: 'OpenAI API error',
            message: sanitizeErrorMessage(error),
          },
          { status: 500 }
        )
      }

      // Handle unexpected errors
      logger.error('[Answering Service Coach API] Unexpected error calling OpenAI:', error)
      return NextResponse.json(
        {
          error: 'Failed to get coach response',
          message: sanitizeErrorMessage(error),
        },
        { status: 500 }
      )
    }

    // Extract response content
    const reply = completion.choices[0]?.message?.content
    if (!reply) {
      logger.error('[Answering Service Coach API] No content in OpenAI response')
      return NextResponse.json(
        { error: 'No response from AI coach' },
        { status: 500 }
      )
    }

    // Log response (first 100 chars)
    const replyPreview = reply.length > 100 ? `${reply.substring(0, 100)}...` : reply
    logger.info(`[Answering Service Coach API] Response: ${replyPreview}`)

    // Return successful response with CORS headers
    const origin = request.headers.get('origin')
    return NextResponse.json(
      {
        reply,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      }
    )
  } catch (error) {
    // Catch any unexpected errors
    logger.error('[Answering Service Coach API] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: sanitizeErrorMessage(error),
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return NextResponse.json({}, { status: 200, headers: getCorsPreflightHeaders(origin) })
}
