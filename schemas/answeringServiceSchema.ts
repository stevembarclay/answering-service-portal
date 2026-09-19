import { z } from 'zod'

/**
 * Zod schema for Answering Service profile configuration (Step 0)
 */
export const profileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  industry: z.union([
    z.enum(['legal', 'medical', 'home_services', 'real_estate', 'professional_services', 'other']),
    z.literal('')
  ]).refine(
    (val) => val !== '',
    {
      message: 'Industry selection is required',
    }
  )
})

/**
 * Zod schema for Answering Service greeting configuration (Step 1)
 */
export const greetingSchema = z.object({
  template: z.string().min(1, 'Please select a greeting template'), // with {business_name} interpolation
  customScript: z.string().max(500).optional(),
  presentAs: z.enum(['employee', 'answering_service']),
  language: z.enum(['english', 'bilingual', 'spanish']).default('english'),
})

/**
 * Zod schema for Answering Service business hours configuration (Step 2)
 */
export const businessHoursSchema = z.object({
  type: z.enum(['standard', 'custom', '24_7']),
  timezone: z.string().min(1, 'Timezone is required'),
  customHours: z.array(z.object({
    day: z.string(),
    open: z.string(),
    close: z.string(),
    closed: z.boolean()
  })).optional()
})

/**
 * Call handling configuration for time conditions
 */
export const callHandlingConfigSchema = z.object({
  action: z.enum(['take_message', 'patch', 'screen_and_patch', 'custom']),
  patchTo: z.string().optional(),
  screeningQuestions: z.array(z.string()).optional(),
  infoToCollect: z.array(z.object({
    field: z.string(),
    required: z.boolean(),
    customLabel: z.string().optional()
  })).optional()
})

/**
 * Zod schema for Answering Service call types configuration (Step 3)
 */
export const callTypesSchema = z.array(z.object({
  id: z.string(),
  name: z.string().min(1, 'Call type name is required'),
  timeConditions: z.object({
    businessHours: callHandlingConfigSchema.optional(),
    afterHours: callHandlingConfigSchema.optional(),
    always: callHandlingConfigSchema.optional() // for 24-hour types
  })
}))

/**
 * Zod schema for Answering Service message delivery configuration (Step 4)
 */
export const messageDeliverySchema = z.object({
  globalDefaults: z.object({
    channels: z.array(z.enum(['email', 'sms', 'portal'])).min(1, 'Select at least one delivery method'),
    emailAddress: z.string().email().optional().or(z.literal('')),
    smsNumber: z.string().optional(),
    urgentSmsEnabled: z.boolean().default(false)
  }),
  callTypeOverrides: z.record(z.string(), z.object({
    channels: z.array(z.enum(['email', 'sms', 'portal'])).optional(),
    urgentOverride: z.boolean().optional()
  })).optional()
}).refine((data) => {
  // If email is selected, emailAddress is required
  if (data.globalDefaults.channels.includes('email') && (!data.globalDefaults.emailAddress || data.globalDefaults.emailAddress === '')) {
    return false
  }
  return true
}, {
  message: 'Email address is required when email delivery is selected',
  path: ['globalDefaults', 'emailAddress']
}).refine((data) => {
  // If sms is selected, smsNumber is required
  if (data.globalDefaults.channels.includes('sms') && (!data.globalDefaults.smsNumber || data.globalDefaults.smsNumber === '')) {
    return false
  }
  return true
}, {
  message: 'Phone number is required when SMS delivery is selected',
  path: ['globalDefaults', 'smsNumber']
})

/**
 * Zod schema for call handling configuration (default handling settings)
 */
export const callHandlingSchema = z.object({
  defaultAction: z.enum(['take_message', 'patch', 'screen_and_patch', 'custom']).default('take_message'),
  patchNumber: z.string().optional(),
  screeningQuestions: z.array(z.string()).default([]),
})

/**
 * Zod schema for billing confirmation
 */
export const billingConfirmSchema = z.object({
  planTier: z.string().default(''),
  confirmedTerms: z.boolean().default(false),
})

/**
 * Zod schema for Answering Service escalation rules configuration (Step 5)
 */
export const escalationSchema = z.object({
  enabled: z.boolean().default(false),
  callTypeRules: z.record(z.string(), z.object({
    canEscalate: z.boolean(),
    criteria: z.string().optional(),
    escalateTo: z.string().optional(),
    timeCondition: z.enum(['business_hours', 'after_hours', '24_hours']).optional()
  })).optional(),
  globalEscalationContact: z.string().optional()
}).refine((data) => {
  // If enabled is true, globalEscalationContact is required
  if (data.enabled && (!data.globalEscalationContact || data.globalEscalationContact.trim() === '')) {
    return false
  }
  return true
}, {
  message: 'Global escalation contact is required when escalation is enabled',
  path: ['globalEscalationContact']
}).refine((data) => {
  // For each callType rule where canEscalate is true, validate requirements
  if (!data.callTypeRules) return true
  
  for (const [callTypeId, rule] of Object.entries(data.callTypeRules)) {
    if (rule.canEscalate) {
      // Criteria is required when canEscalate is true
      if (!rule.criteria || rule.criteria.trim() === '') {
        return false
      }
      // Either escalateTo must be set, or globalEscalationContact must be set (for global contact)
      if (!rule.escalateTo || rule.escalateTo.trim() === '') {
        if (!data.globalEscalationContact || data.globalEscalationContact.trim() === '') {
          return false
        }
      } else {
        // If escalateTo is set, it must be non-empty (already checked above, but ensure it's valid)
        if (rule.escalateTo.trim() === '') {
          return false
        }
      }
    }
  }
  return true
}, {
  message: 'For call types with escalation enabled, criteria is required and either a contact number or global contact must be specified',
  path: ['callTypeRules']
})

/**
 * Zod schema for complete Answering Service setup configuration
 */
export const answeringServiceSetupSchema = z.object({
  profile: profileSchema,
  greeting: greetingSchema,
  businessHours: businessHoursSchema,
  callTypes: callTypesSchema,
  callHandling: callHandlingSchema,
  messageDelivery: messageDeliverySchema,
  escalation: escalationSchema,
  billingConfirm: billingConfirmSchema
})

/**
 * Type inferred from answeringServiceSetupSchema
 */
export type AnsweringServiceSetup = z.infer<typeof answeringServiceSetupSchema>

/**
 * Types inferred from individual schemas
 */
export type Profile = z.infer<typeof profileSchema>
export type Greeting = z.infer<typeof greetingSchema>
export type BusinessHours = z.infer<typeof businessHoursSchema>
export type CallHandlingConfig = z.infer<typeof callHandlingConfigSchema>
export type CallHandling = z.infer<typeof callHandlingSchema>
export type CallTypes = z.infer<typeof callTypesSchema>
export type MessageDelivery = z.infer<typeof messageDeliverySchema>
export type Escalation = z.infer<typeof escalationSchema>
export type BillingConfirm = z.infer<typeof billingConfirmSchema>

