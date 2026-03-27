import {
  getIndustryGreetingTemplates,
  getVerticalPresets,
  applyVerticalPresets,
} from '@/lib/services/answering-service/verticalPresets'
import type { AnsweringServiceSetup } from '@/schemas/answeringServiceSchema'

describe('getIndustryGreetingTemplates', () => {
  const industries = [
    'legal', 'medical', 'home_services',
    'real_estate', 'professional_services', 'other',
  ] as const

  it.each(industries)('last entry is always custom for %s', (industry) => {
    const templates = getIndustryGreetingTemplates(industry)
    expect(templates.at(-1)).toEqual({ id: 'custom', text: 'Custom' })
  })

  it('includes industry-specific templates for legal', () => {
    const ids = getIndustryGreetingTemplates('legal').map(t => t.id)
    expect(ids).toContain('legal-1')
    expect(ids).toContain('legal-2')
  })

  it('includes industry-specific templates for medical', () => {
    const ids = getIndustryGreetingTemplates('medical').map(t => t.id)
    expect(ids).toContain('medical-1')
  })

  it('includes industry-specific templates for real_estate', () => {
    const ids = getIndustryGreetingTemplates('real_estate').map(t => t.id)
    expect(ids).toContain('real_estate-1')
  })

  it('returns base templates for home_services (no industry-specific)', () => {
    const ids = getIndustryGreetingTemplates('home_services').map(t => t.id)
    expect(ids).toContain('template-1')
    expect(ids).not.toContain('home_services-1')
  })
})

// Shared fixture — all five keys present
function expectFullShape(presets: ReturnType<typeof getVerticalPresets>) {
  expect(presets).toMatchObject({
    greeting: expect.objectContaining({ template: expect.any(String) }),
    businessHours: expect.objectContaining({ type: expect.any(String) }),
    callTypes: expect.any(Array),
    messageDelivery: expect.objectContaining({ globalDefaults: expect.any(Object) }),
    escalation: expect.objectContaining({ enabled: expect.any(Boolean) }),
  })
}

describe('getVerticalPresets — non-escalation verticals', () => {
  it('legal: returns full shape', () => {
    expectFullShape(getVerticalPresets('legal'))
  })

  it('legal: auto-selected greeting template exists in dropdown', () => {
    const presets = getVerticalPresets('legal')
    const ids = getIndustryGreetingTemplates('legal').map(t => t.id)
    expect(ids).toContain(presets.greeting.template)
  })

  it('legal: businessHours type is custom', () => {
    expect(getVerticalPresets('legal').businessHours.type).toBe('custom')
  })

  it('legal: escalation is disabled', () => {
    expect(getVerticalPresets('legal').escalation.enabled).toBe(false)
  })

  it('legal: has 4 call types', () => {
    expect(getVerticalPresets('legal').callTypes).toHaveLength(4)
  })

  it('real_estate: auto-selected template exists in dropdown', () => {
    const presets = getVerticalPresets('real_estate')
    const ids = getIndustryGreetingTemplates('real_estate').map(t => t.id)
    expect(ids).toContain(presets.greeting.template)
  })

  it('real_estate: greeting template is real_estate-1', () => {
    expect(getVerticalPresets('real_estate').greeting.template).toBe('real_estate-1')
  })

  it('professional_services: presentAs is answering_service', () => {
    expect(getVerticalPresets('professional_services').greeting.presentAs).toBe('answering_service')
  })

  it('other: returns non-null (regression guard)', () => {
    expect(getVerticalPresets('other')).not.toBeNull()
  })

  it('other: has at least 2 call types', () => {
    expect(getVerticalPresets('other').callTypes.length).toBeGreaterThanOrEqual(2)
  })

  it('other: businessHours type is 24_7', () => {
    expect(getVerticalPresets('other').businessHours.type).toBe('24_7')
  })
})

describe('getVerticalPresets — escalation verticals', () => {
  it('medical: escalation is enabled', () => {
    expect(getVerticalPresets('medical').escalation.enabled).toBe(true)
  })

  it('medical: escalation.callTypeRules keys all match a callType id', () => {
    const presets = getVerticalPresets('medical')
    const callTypeIds = new Set(presets.callTypes.map(ct => ct.id))
    const ruleKeys = Object.keys(presets.escalation.callTypeRules ?? {})
    expect(ruleKeys.length).toBeGreaterThan(0)
    ruleKeys.forEach(key => expect(callTypeIds).toContain(key))
  })

  it('medical: Urgent Medical callType has canEscalate=true in escalation rules', () => {
    const presets = getVerticalPresets('medical')
    const urgentCt = presets.callTypes.find(ct => ct.name === 'Urgent Medical')
    expect(urgentCt).toBeDefined()
    const rule = presets.escalation.callTypeRules?.[urgentCt!.id]
    expect(rule?.canEscalate).toBe(true)
    expect(rule?.timeCondition).toBe('24_hours')
  })

  it('medical: auto-selected template exists in dropdown', () => {
    const presets = getVerticalPresets('medical')
    const ids = getIndustryGreetingTemplates('medical').map(t => t.id)
    expect(ids).toContain(presets.greeting.template)
  })

  it('medical: channels include sms and urgentSmsEnabled is true', () => {
    const presets = getVerticalPresets('medical')
    expect(presets.messageDelivery.globalDefaults.channels).toContain('sms')
    expect(presets.messageDelivery.globalDefaults.urgentSmsEnabled).toBe(true)
  })

  it('medical: businessHours type is custom', () => {
    expect(getVerticalPresets('medical').businessHours.type).toBe('custom')
  })

  it('home_services: escalation.callTypeRules keys all match a callType id', () => {
    const presets = getVerticalPresets('home_services')
    const callTypeIds = new Set(presets.callTypes.map(ct => ct.id))
    const ruleKeys = Object.keys(presets.escalation.callTypeRules ?? {})
    expect(ruleKeys.length).toBeGreaterThan(0)
    ruleKeys.forEach(key => expect(callTypeIds).toContain(key))
  })

  it('home_services: Emergency Service callType has canEscalate=true', () => {
    const presets = getVerticalPresets('home_services')
    const emergencyCt = presets.callTypes.find(ct => ct.name === 'Emergency Service')
    expect(emergencyCt).toBeDefined()
    const rule = presets.escalation.callTypeRules?.[emergencyCt!.id]
    expect(rule?.canEscalate).toBe(true)
  })

  it('home_services: businessHours type is 24_7', () => {
    expect(getVerticalPresets('home_services').businessHours.type).toBe('24_7')
  })
})

// Reusable pristine fixture
const PRISTINE: AnsweringServiceSetup = {
  profile: { businessName: 'Acme', contactName: 'Alice', email: 'alice@acme.com', phone: '', industry: 'legal' },
  greeting: { template: '', presentAs: 'answering_service', language: 'english' },
  businessHours: { type: '24_7', timezone: 'America/New_York' },
  callTypes: [],
  callHandling: { defaultAction: 'take_message', patchNumber: '', screeningQuestions: [] },
  messageDelivery: { globalDefaults: { channels: ['email'], urgentSmsEnabled: false, emailAddress: '' } },
  escalation: { enabled: false },
  billingConfirm: { planTier: '', confirmedTerms: false },
}

describe('applyVerticalPresets', () => {
  it('returns presets for a pristine form with a known industry', () => {
    expect(applyVerticalPresets('legal', PRISTINE)).not.toBeNull()
  })

  it('returns null when greeting.template is non-empty', () => {
    const dirty = { ...PRISTINE, greeting: { ...PRISTINE.greeting, template: 'template-1' } }
    expect(applyVerticalPresets('legal', dirty)).toBeNull()
  })

  it('returns null when callTypes is non-empty', () => {
    const dirty = {
      ...PRISTINE,
      callTypes: [{ id: 'x', name: 'Test', timeConditions: { always: { action: 'take_message' as const } } }],
    }
    expect(applyVerticalPresets('legal', dirty)).toBeNull()
  })

  it('returns null when businessHours.type is not 24_7', () => {
    const dirty = { ...PRISTINE, businessHours: { ...PRISTINE.businessHours, type: 'custom' as const } }
    expect(applyVerticalPresets('legal', dirty)).toBeNull()
  })

  it('returns null when businessHours.customHours is set', () => {
    const dirty = {
      ...PRISTINE,
      businessHours: { ...PRISTINE.businessHours, customHours: [{ day: 'monday', open: '9:00 AM', close: '5:00 PM', closed: false }] },
    }
    expect(applyVerticalPresets('legal', dirty)).toBeNull()
  })

  it('returns null when escalation is enabled', () => {
    const dirty = { ...PRISTINE, escalation: { enabled: true, globalEscalationContact: '555-1234' } }
    expect(applyVerticalPresets('legal', dirty)).toBeNull()
  })

  it('returns null when emailAddress is non-empty', () => {
    const dirty = {
      ...PRISTINE,
      messageDelivery: {
        globalDefaults: { ...PRISTINE.messageDelivery.globalDefaults, emailAddress: 'test@test.com' },
      },
    }
    expect(applyVerticalPresets('legal', dirty)).toBeNull()
  })

  it('returns null when urgentSmsEnabled is true', () => {
    const dirty = {
      ...PRISTINE,
      messageDelivery: {
        globalDefaults: { ...PRISTINE.messageDelivery.globalDefaults, urgentSmsEnabled: true },
      },
    }
    expect(applyVerticalPresets('legal', dirty)).toBeNull()
  })

  it('returns generic presets (not null) for other industry — regression guard', () => {
    const otherPristine = { ...PRISTINE, profile: { ...PRISTINE.profile, industry: 'other' as const } }
    expect(applyVerticalPresets('other', otherPristine)).not.toBeNull()
  })
})
