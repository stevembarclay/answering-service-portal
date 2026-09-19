/**
 * scripts/seed-starter.ts
 *
 * Generic starter seed — one operator org, three sample clients, 30 days of call data.
 * Use this to evaluate the portal or onboard a new Supabase project.
 *
 * Usage: npm run seed:starter
 *
 * Credentials created:
 *   Operator:  operator@starter.example / starter-operator-2026
 *   Client:    client@starter.example   / starter-client-2026
 *
 * Idempotent — deletes previous starter data before re-seeding.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Constants ────────────────────────────────────────────────────────────────

const OPERATOR_EMAIL = 'operator@starter.example'
const OPERATOR_PASSWORD = 'starter-operator-2026'
const CLIENT_EMAIL = 'client@starter.example'
const CLIENT_PASSWORD = 'starter-client-2026'
const ORG_NAME = 'Demo Answering Co.'
const ORG_SLUG = 'demo-answering-co'

const BUSINESSES = [
  { name: 'Westside Dental Group', role: 'main' },
  { name: 'Sunrise Property Management', role: 'secondary' },
  { name: 'Valley Medical Associates', role: 'secondary' },
] as const

// ─── PRNG (seeded for reproducible output) ───────────────────────────────────

function makePrng(seed: number) {
  let v = seed
  return function next(): number {
    v |= 0
    v = (v + 0x6d2b79f5) | 0
    let r = Math.imul(v ^ (v >>> 15), 1 | v)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const rand = makePrng(55)

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

function randItem<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]
}

// ─── Call data config ─────────────────────────────────────────────────────────

const CALLER_NAMES = [
  'Sarah Mitchell', 'James Whitfield', 'Maria Gonzalez', 'Robert Chen',
  'Emily Torres', 'David Nakamura', 'Jennifer Park', 'Thomas Wallace',
  'Amanda Rivera', 'Christopher Lee', 'Patricia Holmes', 'Kevin Anderson',
  'Michelle Patel', 'Daniel Kim', 'Nancy Flores', 'Steven Carter',
] as const

const CALL_TYPES = ['urgent', 'new-client', 'appointment', 'general-info', 'after-hours'] as const
type CallType = (typeof CALL_TYPES)[number]

const MESSAGES: Record<CallType, string[]> = {
  urgent: [
    'Caller needs an urgent callback. Described the matter as time-sensitive. Callback number provided.',
    'Caller said the situation cannot wait and requested an immediate return call.',
  ],
  'new-client': [
    'New caller requesting information about services. Asked about availability and pricing.',
    'Prospective client inquiry. Requested a callback to discuss getting started.',
  ],
  appointment: [
    'Caller requested to reschedule an existing appointment. Available after 10am.',
    'Appointment confirmation request. Caller asked for a callback to confirm the time.',
  ],
  'general-info': [
    'General inquiry about office hours and location.',
    'Caller asked about services and how to get started. No callback requested.',
  ],
  'after-hours': [
    'After-hours caller left a message requesting a callback during business hours.',
    'Evening call — caller said it is not urgent but asked for a first-thing callback.',
  ],
}

function pickCallType(): CallType {
  const roll = rand()
  if (roll < 0.12) return 'urgent'
  if (roll < 0.32) return 'new-client'
  if (roll < 0.50) return 'appointment'
  if (roll < 0.82) return 'general-info'
  return 'after-hours'
}

function pickPriority(callType: CallType): 'high' | 'medium' | 'low' {
  if (callType === 'urgent' || callType === 'after-hours') {
    return rand() < 0.7 ? 'high' : 'medium'
  }
  if (callType === 'new-client' || callType === 'appointment') {
    return rand() < 0.65 ? 'medium' : 'low'
  }
  return 'low'
}

function pickDuration(callType: CallType): number {
  if (callType === 'after-hours' && rand() < 0.3) return 0
  if (callType === 'urgent') return randInt(120, 420)
  if (callType === 'new-client') return randInt(180, 540)
  if (callType === 'appointment') return randInt(60, 180)
  return randInt(60, 240)
}

function makePhone(): string {
  return `555-${randInt(1000, 9999)}`
}

function makeTimestamp(date: Date, callType: CallType): string {
  const ts = new Date(date)
  if (callType === 'after-hours') {
    ts.setUTCHours(rand() < 0.5 ? randInt(0, 5) : randInt(22, 23), randInt(0, 59), randInt(0, 59), 0)
  } else {
    ts.setUTCHours(randInt(14, 23), randInt(0, 59), randInt(0, 59), 0)
  }
  return ts.toISOString()
}

function dailyCount(dayOfWeek: number): number {
  if (dayOfWeek === 0 || dayOfWeek === 6) return randInt(1, 3)
  if (dayOfWeek === 1 || dayOfWeek === 5) return randInt(6, 10)
  return randInt(4, 7)
}

// ─── Reset helpers ────────────────────────────────────────────────────────────

async function resetStarterData(): Promise<void> {
  const businessNames = BUSINESSES.map((b) => b.name)
  const { error } = await supabase.from('businesses').delete().in('name', businessNames)
  if (error) throw new Error(`Failed to reset starter businesses: ${error.message}`)
}

// ─── Operator setup ───────────────────────────────────────────────────────────

async function ensureOperatorOrg(): Promise<string> {
  const { data: existing } = await supabase
    .from('operator_orgs')
    .select('id')
    .eq('slug', ORG_SLUG)
    .maybeSingle()

  if (existing) return existing.id as string

  const { data, error } = await supabase
    .from('operator_orgs')
    .insert({ name: ORG_NAME, slug: ORG_SLUG, plan: 'pro', status: 'active' })
    .select('id')
    .single()

  if (error || !data) throw new Error(`Failed to create operator org: ${error?.message ?? 'Unknown'}`)
  return data.id as string
}

async function ensureAuthUser(email: string, password: string): Promise<string> {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) throw new Error(`Failed to list users: ${listError.message}`)

  const existing = listData.users.find((u) => u.email === email)
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
    return existing.id
  }

  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error(`Failed to create user ${email}: ${error?.message ?? 'Unknown'}`)
  return data.user.id
}

async function ensureOperatorUser(operatorOrgId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('operator_users')
    .upsert(
      { operator_org_id: operatorOrgId, user_id: userId, role: 'admin' },
      { onConflict: 'operator_org_id,user_id' },
    )
  if (error) throw new Error(`Failed to link operator user: ${error.message}`)
}

// ─── Business setup ───────────────────────────────────────────────────────────

async function createBusiness(
  name: string,
  operatorOrgId: string,
  ownerId?: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('businesses')
    .insert({ name, enabled_modules: ['answering_service'], operator_org_id: operatorOrgId })
    .select('id')
    .single()

  if (error || !data) throw new Error(`Failed to create business "${name}": ${error?.message ?? 'Unknown'}`)
  const businessId = data.id as string

  if (ownerId) {
    const { error: mbError } = await supabase.from('users_businesses').insert({
      user_id: ownerId,
      business_id: businessId,
      role: 'owner',
    })
    if (mbError) throw new Error(`Failed to link user to business: ${mbError.message}`)
  }

  return businessId
}

async function insertWizardSession(
  businessId: string,
  userId: string,
  status: 'completed' | 'in_progress',
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase.from('answering_service_wizard_sessions').insert({
    business_id: businessId,
    user_id: userId,
    current_step: status === 'completed' ? 4 : 2,
    wizard_data: {},
    path_selected: 'self_serve',
    status,
    started_at: now,
    ...(status === 'completed' ? { completed_at: now } : {}),
  })
  if (error) throw new Error(`Failed to insert wizard session: ${error.message}`)
}

async function insertBillingRules(businessId: string): Promise<void> {
  const { error } = await supabase.from('billing_rules').insert([
    { business_id: businessId, type: 'per_call', name: 'Per Call Fee', amount: 350, active: true },
    {
      business_id: businessId,
      type: 'per_call',
      name: 'After-hours premium',
      amount: 200,
      call_type_filter: ['after-hours'],
      active: true,
    },
    { business_id: businessId, type: 'flat_monthly', name: 'Monthly Service Fee', amount: 5900, active: true },
  ])
  if (error) throw new Error(`Failed to insert billing rules: ${error.message}`)
}

// ─── Call data ────────────────────────────────────────────────────────────────

async function insertCallData(businessId: string, operatorOrgId: string): Promise<void> {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - 30)

  const rows: Array<Record<string, string | number | boolean | null>> = []
  const cursor = new Date(start)

  while (cursor < today) {
    const count = dailyCount(cursor.getUTCDay())
    for (let i = 0; i < count; i++) {
      const callType = pickCallType()
      const duration = pickDuration(callType)
      const callbackNumber = rand() > 0.2 ? makePhone() : null
      const daysFromEnd = Math.floor((today.getTime() - cursor.getTime()) / 86400000)
      rows.push({
        business_id: businessId,
        operator_org_id: operatorOrgId,
        timestamp: makeTimestamp(cursor, callType),
        caller_name: randItem(CALLER_NAMES),
        caller_number: makePhone(),
        callback_number: callbackNumber,
        call_type: callType,
        direction: 'inbound',
        duration_seconds: duration,
        telephony_status: duration === 0 ? 'missed' : 'completed',
        message: randItem(MESSAGES[callType]),
        has_recording: rand() < 0.08,
        priority: pickPriority(callType),
        portal_status: daysFromEnd <= 2 ? 'new' : 'read',
      })
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from('call_logs').insert(rows.slice(i, i + 100))
    if (error) throw new Error(`Failed to insert call data: ${error.message}`)
  }

  console.log(`  Inserted ${rows.length} calls for Westside Dental Group.`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nStarter seed — clearing previous data...')
  await resetStarterData()

  console.log('Setting up operator org...')
  const operatorOrgId = await ensureOperatorOrg()
  const operatorUserId = await ensureAuthUser(OPERATOR_EMAIL, OPERATOR_PASSWORD)
  await ensureOperatorUser(operatorOrgId, operatorUserId)

  console.log('Creating client user...')
  const clientUserId = await ensureAuthUser(CLIENT_EMAIL, CLIENT_PASSWORD)

  console.log('Creating businesses...')

  // Business 1: Westside Dental Group — main demo client, wizard complete, call data
  const mainId = await createBusiness(BUSINESSES[0].name, operatorOrgId, clientUserId)
  await insertWizardSession(mainId, clientUserId, 'completed')
  await insertBillingRules(mainId)
  await insertCallData(mainId, operatorOrgId)

  // Business 2: Sunrise Property Management — wizard complete, no call data
  const secondId = await createBusiness(BUSINESSES[1].name, operatorOrgId)
  await insertWizardSession(secondId, operatorUserId, 'completed')

  // Business 3: Valley Medical Associates — wizard in progress
  const thirdId = await createBusiness(BUSINESSES[2].name, operatorOrgId)
  await insertWizardSession(thirdId, operatorUserId, 'in_progress')

  console.log('\n── Starter seed complete ──────────────────────────')
  console.log(`  Operator:   ${OPERATOR_EMAIL} / ${OPERATOR_PASSWORD}`)
  console.log(`  Client:     ${CLIENT_EMAIL} / ${CLIENT_PASSWORD}`)
  console.log(`  Org:        ${ORG_NAME} (${ORG_SLUG})`)
  console.log('\n  Clients created:')
  console.log(`    [1] ${BUSINESSES[0].name}  ← log in as client to see portal`)
  console.log(`    [2] ${BUSINESSES[1].name}`)
  console.log(`    [3] ${BUSINESSES[2].name}`)
  console.log('\n  Business IDs (needed for Zapier / API key setup):')
  console.log(`    [1] ${mainId}`)
  console.log(`    [2] ${secondId}`)
  console.log(`    [3] ${thirdId}`)
  console.log()
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
