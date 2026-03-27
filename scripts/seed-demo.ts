import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

import { createServiceRoleClient } from '@/lib/supabase/service'

// Use the concrete return type from createServiceRoleClient so all DB operations are properly typed
type SeedClient = ReturnType<typeof createServiceRoleClient>

const DEMO_EMAIL = 'demo@example.com'
const DEMO_PASSWORD = 'demo-password-2026'
const OPERATOR_EMAIL = 'operator@example.com'
const OPERATOR_PASSWORD = 'operator-password-2026'
const OPERATOR_ORG_NAME = 'Answer First'
const BUSINESS_NAME = 'Riverside Law Group'

const ADDITIONAL_CLIENT_NAMES = [
  'Summit Dental Group',
  'Apex Property Management',
  'Westlake Insurance Agency',
  'Harbor HVAC Services',
  'Brightside Pediatrics',
]

// --- Date utilities ---

function getToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function daysAgo(today: Date, n: number): Date {
  const d = new Date(today)
  d.setUTCDate(d.getUTCDate() - n)
  return d
}

function atTime(date: Date, hours: number, minutes: number, seconds: number): string {
  const d = new Date(date)
  d.setUTCHours(hours, minutes, seconds, 0)
  return d.toISOString()
}

// --- PRNG ---

function makePrng(seed: number) {
  let value = seed

  return function next() {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let result = Math.imul(value ^ (value >>> 15), 1 | value)
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

const rand = makePrng(42)

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

function randItem<T>(items: T[]): T {
  return items[Math.floor(rand() * items.length)]
}

const CALLER_NAMES = [
  'Sarah Mitchell',
  'James Whitfield',
  'Maria Gonzalez',
  'Robert Chen',
  'Emily Torres',
  'David Nakamura',
  'Jennifer Park',
  'Thomas Wallace',
  'Amanda Rivera',
  'Christopher Lee',
  'Patricia Holmes',
  'Kevin Anderson',
  'Michelle Patel',
  'Daniel Kim',
  'Nancy Flores',
  'Steven Carter',
  'Karen Williams',
  'Brian Foster',
  'Linda Thompson',
  'Mark Harris',
]

const MESSAGE_TEMPLATES: Record<string, string[]> = {
  urgent: [
    'Caller needs attorney callback as soon as possible regarding a time-sensitive family law matter.',
    'Client says the situation cannot wait until later today and requested an urgent callback.',
  ],
  'new-client': [
    'Prospective client asked whether the firm handles custody and divorce matters and requested a consultation.',
    'New caller is seeking representation for a separation matter and asked for an attorney callback.',
  ],
  appointment: [
    'Client called to confirm or reschedule an existing appointment and asked for a return call.',
    'Caller requested an appointment update and left a callback number.',
  ],
  'general-info': [
    'Caller asked about office hours and what to bring to an initial consultation.',
    'General inquiry about firm services, parking, and payment options.',
  ],
  'after-hours': [
    'After-hours caller requested a callback during business hours and said the matter is urgent.',
    'Evening caller left a message asking for an attorney callback first thing in the morning.',
  ],
}

function makePhone(): string {
  return `555-${randInt(1000, 9999)}`
}

function pickCallType(): string {
  const roll = rand()
  if (roll < 0.12) return 'urgent'
  if (roll < 0.32) return 'new-client'
  if (roll < 0.50) return 'appointment'
  if (roll < 0.82) return 'general-info'
  return 'after-hours'
}

function pickPriority(callType: string): 'high' | 'medium' | 'low' {
  switch (callType) {
    case 'urgent':
    case 'after-hours':
      return rand() < 0.7 ? 'high' : 'medium'
    case 'new-client':
    case 'appointment':
      return rand() < 0.65 ? 'medium' : 'low'
    default:
      return 'low'
  }
}

function dailyCallCount(dayOfWeek: number): number {
  if (dayOfWeek === 0 || dayOfWeek === 6) return randInt(2, 4)
  if (dayOfWeek === 1 || dayOfWeek === 5) return randInt(8, 12)
  return randInt(5, 8)
}

function generateDuration(callType: string): number {
  if (callType === 'after-hours' && rand() < 0.3) return 0
  if (callType === 'urgent') return randInt(120, 420)
  if (callType === 'new-client') return randInt(180, 540)
  if (callType === 'appointment') return randInt(60, 180)
  return randInt(60, 240)
}

function generateTimestamp(date: Date, callType: string): string {
  const timestamp = new Date(date)
  if (callType === 'after-hours') {
    timestamp.setUTCHours(rand() < 0.5 ? randInt(0, 5) : randInt(22, 23), randInt(0, 59), randInt(0, 59), 0)
  } else {
    timestamp.setUTCHours(randInt(14, 23), randInt(0, 59), randInt(0, 59), 0)
  }
  return timestamp.toISOString()
}

function generateMessage(callType: string, callbackNumber: string | null): string {
  const base = randItem(MESSAGE_TEMPLATES[callType] ?? MESSAGE_TEMPLATES['general-info'])
  return callbackNumber ? `${base} Callback number provided.` : `${base} Caller did not leave a callback number.`
}

async function ensureDemoUser(supabase: SeedClient): Promise<string> {
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) throw new Error(`Failed to list users: ${error.message}`)

  const existing = data.users.find((user) => user.email === DEMO_EMAIL)
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    })
    return existing.id
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })

  if (createError || !created.user) {
    throw new Error(`Failed to create demo user: ${createError?.message ?? 'Unknown error'}`)
  }

  return created.user.id
}

async function resetBusiness(supabase: SeedClient): Promise<void> {
  const { data, error } = await supabase.from('businesses').select('id').eq('name', BUSINESS_NAME).maybeSingle()
  if (error) throw new Error(`Failed to look up existing business: ${error.message}`)

  if (data) {
    const { error: deleteError } = await supabase.from('businesses').delete().eq('id', data.id)
    if (deleteError) {
      throw new Error(`Failed to delete existing demo business: ${deleteError.message}`)
    }
  }
}

async function resetAdditionalClients(supabase: SeedClient): Promise<void> {
  const { error } = await supabase
    .from('businesses')
    .delete()
    .in('name', ADDITIONAL_CLIENT_NAMES)
  if (error) throw new Error(`Failed to reset additional clients: ${error.message}`)
}

async function createBusiness(supabase: SeedClient, userId: string, today: Date): Promise<string> {
  const businessCreatedAt = atTime(daysAgo(today, 90), 9, 0, 0)
  const lastLoginAt = atTime(daysAgo(today, 17), 23, 59, 59)

  const { data: business, error } = await supabase
    .from('businesses')
    .insert({
      name: BUSINESS_NAME,
      enabled_modules: ['answering_service'],
      created_at: businessCreatedAt,
    })
    .select('id')
    .single()

  if (error || !business) {
    throw new Error(`Failed to create business: ${error?.message ?? 'Unknown error'}`)
  }

  const businessId = business.id as string

  const { error: membershipError } = await supabase.from('users_businesses').insert({
    user_id: userId,
    business_id: businessId,
    role: 'owner',
    last_login_at: lastLoginAt,
  })

  if (membershipError) {
    throw new Error(`Failed to link user to business: ${membershipError.message}`)
  }

  return businessId
}

async function insertWizardSession(supabase: SeedClient, businessId: string, userId: string, today: Date): Promise<void> {
  const createdAt = atTime(daysAgo(today, 90), 9, 0, 0)

  const { error } = await supabase.from('answering_service_wizard_sessions').insert({
    business_id: businessId,
    user_id: userId,
    current_step: 4,
    wizard_data: {},
    path_selected: 'self_serve',
    status: 'completed',
    started_at: createdAt,
    completed_at: createdAt,
  })

  if (error) throw new Error(`Failed to insert wizard session: ${error.message}`)
}

async function insertBillingRules(supabase: SeedClient, businessId: string): Promise<void> {
  const { error } = await supabase.from('billing_rules').insert([
    {
      business_id: businessId,
      type: 'per_call',
      name: 'Per Call Fee',
      amount: 350,
      call_type_filter: null,
      active: true,
    },
    {
      business_id: businessId,
      type: 'per_call',
      name: 'After-hours premium',
      amount: 200,
      call_type_filter: ['after-hours'],
      active: true,
    },
    {
      business_id: businessId,
      type: 'flat_monthly',
      name: 'Monthly Maintenance Fee',
      amount: 5900,
      call_type_filter: null,
      active: true,
    },
  ])

  if (error) throw new Error(`Failed to insert billing rules: ${error.message}`)
}

// Historical calls: today-90 through today-11 (deep background data)
async function insertHistoricalCalls(supabase: SeedClient, businessId: string, today: Date): Promise<void> {
  const rows: Array<Record<string, string | number | boolean | null>> = []
  const current = daysAgo(today, 90)
  const end = daysAgo(today, 11)

  while (current <= end) {
    const count = dailyCallCount(current.getUTCDay())
    for (let index = 0; index < count; index += 1) {
      const callType = pickCallType()
      const callbackNumber = rand() > 0.15 ? makePhone() : null
      const durationSeconds = generateDuration(callType)
      rows.push({
        business_id: businessId,
        timestamp: generateTimestamp(current, callType),
        caller_name: randItem(CALLER_NAMES),
        caller_number: makePhone(),
        callback_number: callbackNumber,
        call_type: callType,
        direction: 'inbound',
        duration_seconds: durationSeconds,
        telephony_status: durationSeconds === 0 ? 'missed' : 'completed',
        message: generateMessage(callType, callbackNumber),
        has_recording: rand() < 0.1,
        priority: pickPriority(callType),
        portal_status: 'read',
      })
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }

  for (let index = 0; index < rows.length; index += 100) {
    const { error } = await supabase.from('call_logs').insert(rows.slice(index, index + 100))
    if (error) throw new Error(`Failed to insert historical calls: ${error.message}`)
  }
}

async function insertQaCall(supabase: SeedClient, businessId: string, userId: string, today: Date): Promise<void> {
  const callTimestamp = atTime(daysAgo(today, 40), 14, 32, 0)
  const actionAt = atTime(daysAgo(today, 40), 15, 0, 0)

  const { data, error } = await supabase
    .from('call_logs')
    .insert({
      business_id: businessId,
      timestamp: callTimestamp,
      caller_name: 'James Patterson',
      caller_number: '555-7823',
      callback_number: null,
      call_type: 'urgent',
      direction: 'inbound',
      duration_seconds: 187,
      telephony_status: 'completed',
      message: 'Caller did not leave a callback number. Said matter was urgent but would not provide details.',
      has_recording: false,
      priority: 'high',
      portal_status: 'flagged_qa',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(`Failed to insert QA call: ${error?.message ?? 'Unknown error'}`)

  const { error: actionError } = await supabase.from('message_actions').insert({
    call_log_id: data.id,
    business_id: businessId,
    type: 'flagged_qa',
    by_user_id: userId,
    at: actionAt,
  })

  if (actionError) throw new Error(`Failed to insert QA action: ${actionError.message}`)
}

// Billing periods: 3 paid months before current month + open period for current month
async function insertBillingPeriods(supabase: SeedClient, businessId: string, today: Date): Promise<void> {
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth() // 0-indexed

  function monthStart(y: number, m: number): string {
    return new Date(Date.UTC(y, m, 1)).toISOString()
  }

  function monthEnd(y: number, m: number): string {
    // Day 0 of the next month = last day of this month
    return new Date(Date.UTC(y, m + 1, 0, 23, 59, 59)).toISOString()
  }

  function monthPaidAt(y: number, m: number): string {
    // 4th of the following month
    return new Date(Date.UTC(y, m + 1, 4, 10, 0, 0)).toISOString()
  }

  const callCounts = [114, 94, 100]
  const afterHoursCounts = [8, 7, 9]
  const totalCents = [46100, 38750, 41200]

  const paidPeriods = [-3, -2, -1].map((offset, index) => {
    const d = new Date(Date.UTC(year, month + offset, 1))
    const py = d.getUTCFullYear()
    const pm = d.getUTCMonth()
    const callCount = callCounts[index]
    const ahCount = afterHoursCounts[index]
    const prefix = `p${index}`
    return {
      business_id: businessId,
      period_start: monthStart(py, pm),
      period_end: monthEnd(py, pm),
      status: 'paid',
      total_cents: totalCents[index],
      call_count: callCount,
      line_items: [
        { ruleId: `${prefix}-r1`, ruleName: 'Per Call Fee', unitDescription: `${callCount} calls × $3.50`, subtotalCents: callCount * 350 },
        { ruleId: `${prefix}-r2`, ruleName: 'After-hours premium', unitDescription: `${ahCount} after-hours calls × $2.00`, subtotalCents: ahCount * 200 },
        { ruleId: `${prefix}-r3`, ruleName: 'Monthly Maintenance Fee', unitDescription: 'Monthly fee', subtotalCents: 5900 },
      ],
      paid_at: monthPaidAt(py, pm),
    }
  })

  const openPeriod = {
    business_id: businessId,
    period_start: monthStart(year, month),
    period_end: monthEnd(year, month),
    status: 'open',
  }

  const { error } = await supabase.from('billing_periods').insert([...paidPeriods, openPeriod])
  if (error) throw new Error(`Failed to insert billing periods: ${error.message}`)
}

// Recent calls: today-10 through today-4, plus first story beat at today-3
async function insertMarchCalls(supabase: SeedClient, businessId: string, today: Date): Promise<void> {
  const marchRows: Array<Record<string, string | number | boolean | null>> = []
  const current = daysAgo(today, 10)
  const end = daysAgo(today, 4)

  while (current <= end) {
    const count = dailyCallCount(current.getUTCDay())
    for (let index = 0; index < count; index += 1) {
      const callType = pickCallType()
      const callbackNumber = rand() > 0.2 ? makePhone() : null
      const durationSeconds = generateDuration(callType)
      marchRows.push({
        business_id: businessId,
        timestamp: generateTimestamp(current, callType),
        caller_name: randItem(CALLER_NAMES),
        caller_number: makePhone(),
        callback_number: callbackNumber,
        call_type: callType,
        direction: 'inbound',
        duration_seconds: durationSeconds,
        telephony_status: durationSeconds === 0 ? 'missed' : 'completed',
        message: generateMessage(callType, callbackNumber),
        has_recording: false,
        priority: pickPriority(callType),
        portal_status: 'read',
      })
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }

  const storyDay = daysAgo(today, 3)
  const storyCalls = [
    {
      business_id: businessId,
      timestamp: atTime(storyDay, 7, 47, 0),
      caller_name: 'Marcus Webb',
      caller_number: '555-0192',
      callback_number: '555-0192',
      call_type: 'urgent',
      direction: 'inbound',
      duration_seconds: 167,
      telephony_status: 'completed',
      message: "Calling re: tomorrow's hearing. Needs attorney callback before 8am. Available at 555-0192.",
      has_recording: false,
      priority: 'high',
      portal_status: 'new',
    },
    {
      business_id: businessId,
      timestamp: atTime(storyDay, 4, 22, 0),
      caller_name: 'Sandra Cho',
      caller_number: '555-0847',
      callback_number: '555-0847',
      call_type: 'new-client',
      direction: 'inbound',
      duration_seconds: 223,
      telephony_status: 'completed',
      message: 'Interested in family law. Going through divorce. Asks if firm handles custody. Available 9am–12pm at 555-0847.',
      has_recording: false,
      priority: 'medium',
      portal_status: 'new',
    },
    {
      business_id: businessId,
      timestamp: atTime(storyDay, 2, 5, 0),
      caller_name: 'David Park',
      caller_number: '555-2215',
      callback_number: null,
      call_type: 'general-info',
      direction: 'inbound',
      duration_seconds: 95,
      telephony_status: 'completed',
      message: 'Asked about office hours and parking validation.',
      has_recording: false,
      priority: 'low',
      portal_status: 'new',
    },
  ]

  const { error } = await supabase.from('call_logs').insert([...marchRows, ...storyCalls])
  if (error) throw new Error(`Failed to insert recent calls: ${error.message}`)
}

// Most-recent calls: today-2 through today-1, plus final story beat (yesterday + today)
async function insertLateMarchCalls(supabase: SeedClient, businessId: string, today: Date): Promise<void> {
  const rand2 = makePrng(99)

  function r2Int(min: number, max: number): number {
    return Math.floor(rand2() * (max - min + 1)) + min
  }
  function r2Item<T>(items: T[]): T {
    return items[Math.floor(rand2() * items.length)]
  }
  function r2CallType(): string {
    const roll = rand2()
    if (roll < 0.12) return 'urgent'
    if (roll < 0.32) return 'new-client'
    if (roll < 0.50) return 'appointment'
    if (roll < 0.82) return 'general-info'
    return 'after-hours'
  }
  function r2Priority(callType: string): 'high' | 'medium' | 'low' {
    switch (callType) {
      case 'urgent':
      case 'after-hours':
        return rand2() < 0.7 ? 'high' : 'medium'
      case 'new-client':
      case 'appointment':
        return rand2() < 0.65 ? 'medium' : 'low'
      default:
        return 'low'
    }
  }
  function r2Duration(callType: string): number {
    if (callType === 'after-hours' && rand2() < 0.3) return 0
    if (callType === 'urgent') return r2Int(120, 420)
    if (callType === 'new-client') return r2Int(180, 540)
    if (callType === 'appointment') return r2Int(60, 180)
    return r2Int(60, 240)
  }
  function r2Timestamp(date: Date, callType: string): string {
    const timestamp = new Date(date)
    if (callType === 'after-hours') {
      timestamp.setUTCHours(rand2() < 0.5 ? r2Int(0, 5) : r2Int(22, 23), r2Int(0, 59), r2Int(0, 59), 0)
    } else {
      timestamp.setUTCHours(r2Int(14, 23), r2Int(0, 59), r2Int(0, 59), 0)
    }
    return timestamp.toISOString()
  }
  function r2DailyCount(dayOfWeek: number): number {
    if (dayOfWeek === 0 || dayOfWeek === 6) return r2Int(2, 4)
    if (dayOfWeek === 1 || dayOfWeek === 5) return r2Int(8, 12)
    return r2Int(5, 8)
  }
  function r2Phone(): string {
    return `555-${r2Int(1000, 9999)}`
  }
  function r2Message(callType: string, callbackNumber: string | null): string {
    const base = r2Item(MESSAGE_TEMPLATES[callType] ?? MESSAGE_TEMPLATES['general-info'])
    return callbackNumber ? `${base} Callback number provided.` : `${base} Caller did not leave a callback number.`
  }

  const rows: Array<Record<string, string | number | boolean | null>> = []
  const current = daysAgo(today, 2)
  const end = daysAgo(today, 1)

  while (current <= end) {
    const count = r2DailyCount(current.getUTCDay())
    for (let index = 0; index < count; index += 1) {
      const callType = r2CallType()
      const callbackNumber = rand2() > 0.2 ? r2Phone() : null
      const durationSeconds = r2Duration(callType)
      rows.push({
        business_id: businessId,
        timestamp: r2Timestamp(current, callType),
        caller_name: r2Item(CALLER_NAMES),
        caller_number: r2Phone(),
        callback_number: callbackNumber,
        call_type: callType,
        direction: 'inbound',
        duration_seconds: durationSeconds,
        telephony_status: durationSeconds === 0 ? 'missed' : 'completed',
        message: r2Message(callType, callbackNumber),
        has_recording: false,
        priority: r2Priority(callType),
        portal_status: 'read',
      })
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }

  const yesterday = daysAgo(today, 1)
  const storyCalls = [
    {
      business_id: businessId,
      timestamp: atTime(yesterday, 16, 30, 0),
      caller_name: 'Victoria Nash',
      caller_number: '555-0381',
      callback_number: '555-0381',
      call_type: 'urgent',
      direction: 'inbound',
      duration_seconds: 198,
      telephony_status: 'completed',
      message: 'Attorney callback needed before court filing deadline tomorrow morning. Matter is time-sensitive. Available at 555-0381.',
      has_recording: false,
      priority: 'high',
      portal_status: 'new',
    },
    {
      business_id: businessId,
      timestamp: atTime(today, 9, 15, 0),
      caller_name: 'Rachel Nguyen',
      caller_number: '555-0624',
      callback_number: '555-0624',
      call_type: 'new-client',
      direction: 'inbound',
      duration_seconds: 215,
      telephony_status: 'completed',
      message: 'Prospective patient inquiry from a pediatric practice asking about consultation availability. Callback at 555-0624.',
      has_recording: false,
      priority: 'medium',
      portal_status: 'new',
    },
    {
      business_id: businessId,
      timestamp: atTime(today, 11, 2, 0),
      caller_name: 'Tom Archer',
      caller_number: '555-0753',
      callback_number: null,
      call_type: 'appointment',
      direction: 'inbound',
      duration_seconds: 88,
      telephony_status: 'completed',
      message: 'Appointment rescheduling request. Caller did not leave a callback number.',
      has_recording: false,
      priority: 'low',
      portal_status: 'new',
    },
  ]

  const { error } = await supabase.from('call_logs').insert([...rows, ...storyCalls])
  if (error) throw new Error(`Failed to insert most-recent calls: ${error.message}`)
}

async function ensureOperatorOrg(supabase: SeedClient): Promise<string> {
  const { data: existing } = await supabase
    .from('operator_orgs')
    .select('id')
    .eq('slug', 'answer-first')
    .maybeSingle()

  if (existing) return existing.id as string

  const { data, error } = await supabase
    .from('operator_orgs')
    .insert({ name: OPERATOR_ORG_NAME, slug: 'answer-first', plan: 'pro', status: 'active' })
    .select('id')
    .single()

  if (error || !data) throw new Error(`Failed to create operator org: ${error?.message ?? 'Unknown error'}`)
  return data.id as string
}

async function ensureOperatorUser(supabase: SeedClient, operatorOrgId: string, businessId: string): Promise<void> {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) throw new Error(`Failed to list users: ${listError.message}`)

  let userId: string
  const existing = listData.users.find((u) => u.email === OPERATOR_EMAIL)

  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password: OPERATOR_PASSWORD,
      email_confirm: true,
    })
    userId = existing.id
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: OPERATOR_EMAIL,
      password: OPERATOR_PASSWORD,
      email_confirm: true,
    })
    if (createError || !created.user) {
      throw new Error(`Failed to create operator user: ${createError?.message ?? 'Unknown error'}`)
    }
    userId = created.user.id
  }

  const { error: opError } = await supabase
    .from('operator_users')
    .upsert({ operator_org_id: operatorOrgId, user_id: userId, role: 'admin' }, { onConflict: 'user_id' })
  if (opError) throw new Error(`Failed to upsert operator_users: ${opError.message}`)

  const { error: ubError } = await supabase
    .from('users_businesses')
    .upsert({ user_id: userId, business_id: businessId, role: 'viewer' }, { onConflict: 'user_id,business_id' })
  if (ubError) throw new Error(`Failed to upsert users_businesses for operator: ${ubError.message}`)
}

async function insertAdditionalClients(supabase: SeedClient, operatorOrgId: string, today: Date): Promise<void> {
  const rand3 = makePrng(77)

  function r3Int(min: number, max: number): number {
    return Math.floor(rand3() * (max - min + 1)) + min
  }
  function r3Item<T>(items: T[]): T {
    return items[Math.floor(rand3() * items.length)]
  }
  function r3CallType(): string {
    const roll = rand3()
    if (roll < 0.12) return 'urgent'
    if (roll < 0.32) return 'new-client'
    if (roll < 0.50) return 'appointment'
    if (roll < 0.82) return 'general-info'
    return 'after-hours'
  }
  function r3Priority(callType: string): 'high' | 'medium' | 'low' {
    switch (callType) {
      case 'urgent':
      case 'after-hours':
        return rand3() < 0.7 ? 'high' : 'medium'
      case 'new-client':
      case 'appointment':
        return rand3() < 0.65 ? 'medium' : 'low'
      default:
        return 'low'
    }
  }
  function r3Duration(callType: string): number {
    if (callType === 'after-hours' && rand3() < 0.3) return 0
    if (callType === 'urgent') return r3Int(120, 420)
    if (callType === 'new-client') return r3Int(180, 540)
    if (callType === 'appointment') return r3Int(60, 180)
    return r3Int(60, 240)
  }

  const businessIds: string[] = []
  for (const name of ADDITIONAL_CLIENT_NAMES) {
    const { data, error } = await supabase
      .from('businesses')
      .insert({
        name,
        enabled_modules: ['answering_service'],
        operator_org_id: operatorOrgId,
      })
      .select('id')
      .single()
    if (error || !data) throw new Error(`Failed to create business ${name}: ${error?.message ?? 'Unknown'}`)
    businessIds.push(data.id as string)
  }

  const { data: opUser, error: opUserError } = await supabase
    .from('operator_users')
    .select('user_id')
    .eq('operator_org_id', operatorOrgId)
    .limit(1)
    .maybeSingle()
  if (opUserError) throw new Error(`Failed to fetch operator user: ${opUserError.message}`)
  if (!opUser) throw new Error('No operator user found — run seed in correct order')
  const wizardUserId = opUser.user_id as string

  const wizardStartedAt = atTime(daysAgo(today, 70), 9, 0, 0)
  const wizardCompletedAt = atTime(daysAgo(today, 70), 9, 30, 0)

  for (let i = 0; i < 5; i++) {
    const isCompleted = i < 3
    const { error } = await supabase.from('answering_service_wizard_sessions').insert({
      business_id: businessIds[i],
      user_id: wizardUserId,
      current_step: isCompleted ? 4 : 2,
      wizard_data: {},
      path_selected: 'self_serve',
      status: isCompleted ? 'completed' : 'in_progress',
      started_at: wizardStartedAt,
      ...(isCompleted ? { completed_at: wizardCompletedAt } : {}),
    })
    if (error) throw new Error(`Failed to insert wizard session for ${ADDITIONAL_CLIENT_NAMES[i]}: ${error.message}`)
  }

  const baseDate = daysAgo(today, 30)
  for (const bizIdx of [0, 3]) {
    const bizId = businessIds[bizIdx]
    const callCount = r3Int(15, 25)
    const rows: Array<Record<string, string | number | boolean | null>> = []

    for (let i = 0; i < callCount; i++) {
      const dayOffset = r3Int(0, 28)
      const callDate = new Date(baseDate)
      callDate.setUTCDate(callDate.getUTCDate() + dayOffset)

      const callType = r3CallType()
      const callbackNumber = rand3() > 0.2 ? `555-${r3Int(1000, 9999)}` : null
      const durationSeconds = r3Duration(callType)

      const timestamp = new Date(callDate)
      if (callType === 'after-hours') {
        timestamp.setUTCHours(rand3() < 0.5 ? r3Int(0, 5) : r3Int(22, 23), r3Int(0, 59), r3Int(0, 59), 0)
      } else {
        timestamp.setUTCHours(r3Int(14, 23), r3Int(0, 59), r3Int(0, 59), 0)
      }

      const base = r3Item(MESSAGE_TEMPLATES[callType] ?? MESSAGE_TEMPLATES['general-info'])
      const message = callbackNumber
        ? `${base} Callback number provided.`
        : `${base} Caller did not leave a callback number.`

      rows.push({
        business_id: bizId,
        timestamp: timestamp.toISOString(),
        caller_name: r3Item(CALLER_NAMES),
        caller_number: `555-${r3Int(1000, 9999)}`,
        callback_number: callbackNumber,
        call_type: callType,
        direction: 'inbound',
        duration_seconds: durationSeconds,
        telephony_status: durationSeconds === 0 ? 'missed' : 'completed',
        message,
        has_recording: false,
        priority: r3Priority(callType),
        portal_status: 'read',
      })
    }

    const { error } = await supabase.from('call_logs').insert(rows)
    if (error) throw new Error(`Failed to insert call logs for ${ADDITIONAL_CLIENT_NAMES[bizIdx]}: ${error.message}`)
  }
}

async function _runSeed(supabase: SeedClient): Promise<void> {
  const today = getToday()

  await resetAdditionalClients(supabase)
  const userId = await ensureDemoUser(supabase)
  await resetBusiness(supabase)
  const businessId = await createBusiness(supabase, userId, today)
  await insertWizardSession(supabase, businessId, userId, today)
  await insertBillingRules(supabase, businessId)
  await insertHistoricalCalls(supabase, businessId, today)
  await insertQaCall(supabase, businessId, userId, today)
  await insertBillingPeriods(supabase, businessId, today)
  await insertMarchCalls(supabase, businessId, today)
  await insertLateMarchCalls(supabase, businessId, today)

  const operatorOrgId = await ensureOperatorOrg(supabase)
  await ensureOperatorUser(supabase, operatorOrgId, businessId)

  const { error: linkError } = await supabase
    .from('businesses')
    .update({ operator_org_id: operatorOrgId })
    .eq('id', businessId)
  if (linkError) throw new Error(`Failed to link business to operator org: ${linkError.message}`)

  await insertAdditionalClients(supabase, operatorOrgId, today)
}

/**
 * Run the demo seed using the service role client.
 * Called by the demo-reset cron route. Safe to import — does not execute on import.
 */
export async function runDemoSeed(): Promise<void> {
  const supabase = createServiceRoleClient()
  await _runSeed(supabase)
}

async function main(): Promise<void> {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') })
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
  }

  const rawClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  // SAFETY: createClient here and in createServiceRoleClient use identical options; the type
  // parameter mismatch is a TypeScript generic inference artifact, not a structural difference.
  const supabase = rawClient as unknown as SeedClient

  console.log('Seeding Riverside Law Group demo...')
  await _runSeed(supabase)
  console.log('Seed complete.')
  console.log(`Client:   ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`Operator: ${OPERATOR_EMAIL} / ${OPERATOR_PASSWORD}`)
  console.log(`Business: ${BUSINESS_NAME}`)
}

// Only invoke when executed directly as a script (not when imported by the API route)
const isDirectRun = process.argv[1] !== undefined && process.argv[1].includes('seed-demo')
if (isDirectRun) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
