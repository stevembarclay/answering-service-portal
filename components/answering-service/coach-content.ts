/**
 * Coach content for Answering Service setup wizard
 * Provides contextual tips and common setup recommendations based on step and industry
 */

export interface CoachTip {
  tip: string
  commonSetup: string[]
  warning?: string
}

export interface CoachContent {
  [stepId: string]: {
    default: CoachTip
    [industry: string]: CoachTip
  }
}

export const coachContent: CoachContent = {
  profile: {
    default: {
      tip: 'Start by selecting your industry. This helps us provide industry-specific recommendations throughout setup.',
      commonSetup: [
        'Most businesses choose their primary industry category',
        'You can change this later in settings',
        'Industry selection enables compliance guardrails'
      ]
    }
  },
  hours: {
    default: {
      tip: 'Set your business hours to control when calls are answered live vs. routed to voicemail or message-taking.',
      commonSetup: [
        'Standard hours (Mon-Fri 9-5) work for most businesses',
        'Custom hours let you set different times per day',
        '24/7 coverage routes all calls to live agents'
      ]
    },
    legal: {
      tip: 'Legal practices often need custom hours to match court schedules and client availability. Consider time zones for multi-state practices.',
      commonSetup: [
        'Many law firms use custom hours (e.g., 8am-6pm weekdays)',
        'After-hours calls typically go to message-taking',
        'Emergency escalation is common for urgent client matters'
      ]
    },
    medical: {
      tip: 'Medical practices should align hours with appointment availability. Consider lunch breaks and early/late patient access.',
      commonSetup: [
        'Most practices use custom hours (e.g., 8am-5pm with 12-1pm closed)',
        'After-hours calls often use emergency escalation',
        'HIPAA-compliant message delivery is required'
      ],
      warning: '⚠️ HIPAA Notice: Ensure all message delivery methods are HIPAA-compliant. SMS may not be suitable for PHI.'
    },
    home_services: {
      tip: 'Home service businesses often need extended hours to match customer schedules. Consider early morning and evening availability.',
      commonSetup: [
        'Many use extended hours (7am-8pm weekdays)',
        'Weekend availability is common',
        'After-hours calls typically use message-taking with next-day callback'
      ]
    }
  },
  handling: {
    default: {
      tip: 'Choose how calls are handled. "Take Message" is simplest, while "Screen and Patch" gives you control over which calls you take.',
      commonSetup: [
        'Most businesses start with "Take Message"',
        '"Screen and Patch" is popular for busy professionals',
        'Direct patch works well for small teams'
      ]
    },
    legal: {
      tip: 'Legal practices often use "Screen and Patch" to filter urgent client matters from general inquiries. This helps prioritize your time.',
      commonSetup: [
        'Screen and Patch is most common',
        'Screening questions: "Is this regarding an active case?"',
        'New client inquiries often go to message-taking'
      ]
    },
    medical: {
      tip: 'Medical practices typically use "Screen and Patch" to distinguish urgent patient calls from appointment requests. HIPAA compliance is critical.',
      commonSetup: [
        'Screen and Patch with medical-specific questions',
        'Screening: "Is this a medical emergency?"',
        'Appointment requests go to message-taking',
        'Patient calls may require HIPAA-compliant routing'
      ],
      warning: '⚠️ HIPAA Notice: Ensure call handling workflows comply with HIPAA. Patient information must be protected.'
    },
    home_services: {
      tip: 'Home service businesses often use "Take Message" for new inquiries and "Screen and Patch" for existing customers with urgent needs.',
      commonSetup: [
        'New inquiries: Take Message',
        'Existing customers: Screen and Patch',
        'Screening: "Are you an existing customer?"'
      ]
    }
  },
  delivery: {
    default: {
      tip: 'Select how you want to receive messages. Email is most common, while SMS provides instant notifications for urgent messages.',
      commonSetup: [
        'Email delivery is used by 90% of businesses',
        'SMS is popular for urgent notifications',
        'Portal access provides a centralized message hub'
      ]
    },
    legal: {
      tip: 'Legal practices often use email for detailed message transcripts and SMS for urgent client matters. Ensure secure delivery methods.',
      commonSetup: [
        'Email for detailed transcripts',
        'SMS for urgent client matters only',
        'Portal for team access to messages'
      ]
    },
    medical: {
      tip: 'Medical practices must use HIPAA-compliant delivery methods. Email with encryption is standard, while SMS may not be suitable for PHI.',
      commonSetup: [
        'HIPAA-compliant email required',
        'Portal access for secure message viewing',
        'SMS only for non-PHI notifications',
        'Encrypted delivery channels preferred'
      ],
      warning: '⚠️ HIPAA Notice: SMS delivery may not be HIPAA-compliant for patient information. Use encrypted email or secure portal only.'
    },
    home_services: {
      tip: 'Home service businesses often use SMS for instant notifications and email for detailed job information. Multi-channel delivery is common.',
      commonSetup: [
        'SMS for instant notifications',
        'Email for detailed job information',
        'Portal for team coordination'
      ]
    }
  },
  greeting: {
    default: {
      tip: 'Your greeting is the first impression callers hear. Keep it professional, clear, and mention your business name. Answering Service provides fully bilingual agents - choose the language preference that best matches your caller base.',
      commonSetup: [
        'Keep greeting under 30 seconds',
        'Always mention business name',
        'Include hours if they differ from standard',
        'Professional and friendly tone',
        'Bilingual support available for English & Spanish'
      ]
    },
    legal: {
      tip: 'Legal practice greetings should be professional and reassuring. Mention your firm name clearly and indicate when you\'ll return calls.',
      commonSetup: [
        'Professional, formal tone',
        'Clear firm name pronunciation',
        'Return call timeframe (e.g., "within 24 hours")',
        'Urgent matter instructions if applicable'
      ]
    },
    medical: {
      tip: 'Medical practice greetings should be calm and professional. Include instructions for emergencies and appointment scheduling.',
      commonSetup: [
        'Calm, professional tone',
        'Clear practice name',
        'Emergency instructions (if applicable)',
        'Appointment scheduling information',
        'HIPAA-compliant messaging'
      ],
      warning: '⚠️ HIPAA Notice: Greeting scripts should not request or confirm patient information. Keep messages general and compliant.'
    },
    home_services: {
      tip: 'Home service greetings should be friendly and action-oriented. Mention your service area and typical response time.',
      commonSetup: [
        'Friendly, approachable tone',
        'Service area mention',
        'Response time expectations',
        'Emergency service availability'
      ]
    }
  },
  escalation: {
    default: {
      tip: 'Emergency escalation lets urgent calls reach you immediately, even after hours. Define clear criteria for what qualifies as an emergency.',
      commonSetup: [
        'Most businesses enable emergency escalation',
        'Common criteria: "life-threatening" or "business-critical"',
        'After-hours action: Take Message (most common)',
        'Emergency contact: Mobile number preferred'
      ]
    },
    legal: {
      tip: 'Legal practices often enable emergency escalation for urgent client matters. Define what constitutes an emergency (e.g., court deadlines, client emergencies).',
      commonSetup: [
        'Emergency escalation enabled',
        'Criteria: "Court deadline" or "client emergency"',
        'After-hours: Take Message with urgent flag',
        'Emergency contact: Attorney mobile number'
      ]
    },
    medical: {
      tip: 'Medical practices must have clear emergency protocols. HIPAA-compliant escalation is critical for patient safety.',
      commonSetup: [
        'Emergency escalation always enabled',
        'Criteria: "Medical emergency" or "urgent patient matter"',
        'After-hours: Emergency escalation to on-call provider',
        'Standard calls: Take Message',
        'HIPAA-compliant contact methods required'
      ],
      warning: '⚠️ HIPAA Notice: Emergency escalation must use HIPAA-compliant communication channels. Patient information must be protected.'
    },
    home_services: {
      tip: 'Home service businesses often enable emergency escalation for urgent service calls (e.g., water leaks, HVAC failures).',
      commonSetup: [
        'Emergency escalation for urgent service calls',
        'Criteria: "Water leak" or "HVAC failure"',
        'After-hours: Emergency escalation to on-call technician',
        'Standard calls: Take Message with next-day callback'
      ]
    }
  }
}

/**
 * Get coach tip for a specific step and industry
 */
export function getCoachTip(stepId: string, industry: string | null): CoachTip {
  const stepContent = coachContent[stepId]
  if (!stepContent) {
    return {
      tip: 'I\'m here to help with your setup. What questions do you have?',
      commonSetup: []
    }
  }

  if (industry && stepContent[industry]) {
    return stepContent[industry]
  }

  return stepContent.default
}

/**
 * Get industry display name
 */
export function getIndustryDisplayName(industry: string | null): string {
  if (!industry) return ''
  
  const displayNames: Record<string, string> = {
    legal: 'Legal Practices',
    medical: 'Medical Practices',
    home_services: 'Home Services',
    retail: 'Retail',
    restaurant: 'Restaurant',
    real_estate: 'Real Estate',
    consulting: 'Consulting',
    other: 'Other'
  }

  return displayNames[industry] || industry
}

