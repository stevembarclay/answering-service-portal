import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import type { ContactRow, ShiftRow } from './onCallScheduler'

// ── Types ──────────────────────────────────────────────────────────────────

export interface OnCallContact {
  id: string
  businessId: string
  name: string
  phone: string
  role: string | null
  notes: string | null
  displayOrder: number
  createdAt: string
}

export interface OnCallShift {
  id: string
  businessId: string
  name: string
  daysOfWeek: number[]
  startTime: string
  endTime: string
  escalationSteps: Array<{ contactId: string; waitMinutes: number | null }>
  active: boolean
  createdAt: string
}

export interface UpsertContactInput {
  businessId: string
  name: string
  phone: string
  role?: string | null
  notes?: string | null
  displayOrder?: number
}

export interface UpsertShiftInput {
  businessId: string
  name: string
  daysOfWeek: number[]
  startTime: string // "HH:MM"
  endTime: string   // "HH:MM"
  escalationSteps: Array<{ contactId: string; waitMinutes: number | null }>
}

// ── Contacts ───────────────────────────────────────────────────────────────

export async function listContacts(businessId: string): Promise<OnCallContact[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('on_call_contacts')
    .select('id, business_id, name, phone, role, notes, display_order, created_at')
    .eq('business_id', businessId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error('Failed to list on-call contacts.')
  return (data ?? []).map(mapContact)
}

export async function createContact(input: UpsertContactInput): Promise<OnCallContact> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('on_call_contacts')
    .insert({
      business_id: input.businessId,
      name: input.name,
      phone: input.phone,
      role: input.role ?? null,
      notes: input.notes ?? null,
      display_order: input.displayOrder ?? 0,
    })
    .select('id, business_id, name, phone, role, notes, display_order, created_at')
    .single()

  if (error || !data) throw new Error('Failed to create on-call contact.')
  return mapContact(data)
}

export async function updateContact(
  contactId: string,
  businessId: string,
  input: Partial<UpsertContactInput>
): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('on_call_contacts')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
    })
    .eq('id', contactId)
    .eq('business_id', businessId)

  if (error) throw new Error('Failed to update on-call contact.')
}

export async function deleteContact(contactId: string, businessId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('on_call_contacts')
    .delete()
    .eq('id', contactId)
    .eq('business_id', businessId)

  if (error) throw new Error('Failed to delete on-call contact.')
}

// ── Shifts ─────────────────────────────────────────────────────────────────

export async function listShifts(businessId: string): Promise<OnCallShift[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('on_call_shifts')
    .select('id, business_id, name, days_of_week, start_time, end_time, escalation_steps, active, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  if (error) throw new Error('Failed to list on-call shifts.')
  return (data ?? []).map(mapShift)
}

export async function createShift(input: UpsertShiftInput): Promise<OnCallShift> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('on_call_shifts')
    .insert({
      business_id: input.businessId,
      name: input.name,
      days_of_week: input.daysOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      escalation_steps: input.escalationSteps,
    })
    .select('id, business_id, name, days_of_week, start_time, end_time, escalation_steps, active, created_at')
    .single()

  if (error || !data) throw new Error('Failed to create on-call shift.')
  return mapShift(data)
}

export async function updateShift(
  shiftId: string,
  businessId: string,
  input: Partial<UpsertShiftInput & { active: boolean }>
): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('on_call_shifts')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.daysOfWeek !== undefined && { days_of_week: input.daysOfWeek }),
      ...(input.startTime !== undefined && { start_time: input.startTime }),
      ...(input.endTime !== undefined && { end_time: input.endTime }),
      ...(input.escalationSteps !== undefined && { escalation_steps: input.escalationSteps }),
      ...(input.active !== undefined && { active: input.active }),
    })
    .eq('id', shiftId)
    .eq('business_id', businessId)

  if (error) throw new Error('Failed to update on-call shift.')
}

export async function deleteShift(shiftId: string, businessId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('on_call_shifts')
    .delete()
    .eq('id', shiftId)
    .eq('business_id', businessId)

  if (error) throw new Error('Failed to delete on-call shift.')
}

// ── Timezone ───────────────────────────────────────────────────────────────

export async function getBusinessTimezone(businessId: string): Promise<string | null> {
  // Service role: called from both session-authenticated portals and the
  // sessionless public API (bearer token), so we cannot rely on RLS auth.uid().
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('businesses')
    .select('on_call_timezone')
    .eq('id', businessId)
    .maybeSingle()
  return (data as { on_call_timezone?: string | null } | null)?.on_call_timezone ?? null
}

export async function setBusinessTimezone(businessId: string, timezone: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('businesses')
    .update({ on_call_timezone: timezone })
    .eq('id', businessId)
  if (error) throw new Error('Failed to save timezone.')
}

// ── Helpers for the scheduler ──────────────────────────────────────────────

/** Load shifts and contacts in the shape expected by resolveActiveShift.
 *  Uses service role because callers (public API, operator portal) have no
 *  Supabase session — RLS auth.uid() would be NULL and return zero rows. */
export async function loadSchedulerData(businessId: string): Promise<{
  shifts: ShiftRow[]
  contacts: Map<string, ContactRow>
}> {
  const supabase = createServiceRoleClient()

  const [{ data: shiftRows, error: shiftErr }, { data: contactRows, error: contactErr }] =
    await Promise.all([
      supabase
        .from('on_call_shifts')
        .select('id, business_id, name, days_of_week, start_time, end_time, escalation_steps, active, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true }),
      supabase
        .from('on_call_contacts')
        .select('id, business_id, name, phone, role, notes, display_order, created_at')
        .eq('business_id', businessId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

  if (shiftErr) throw new Error('Failed to load on-call shifts.')
  if (contactErr) throw new Error('Failed to load on-call contacts.')

  const shifts = (shiftRows ?? []).map(mapShift)
  const contacts = (contactRows ?? []).map(mapContact)

  return {
    shifts: shifts.map((s) => ({
      id: s.id,
      name: s.name,
      days_of_week: s.daysOfWeek,
      start_time: s.startTime,
      end_time: s.endTime,
      escalation_steps: s.escalationSteps,
      active: s.active,
    })),
    contacts: new Map(
      contacts.map((c) => [
        c.id,
        { id: c.id, name: c.name, phone: c.phone, role: c.role, notes: c.notes },
      ])
    ),
  }
}

// ── Row mappers ────────────────────────────────────────────────────────────

function mapContact(row: Record<string, unknown>): OnCallContact {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    name: row.name as string,
    phone: row.phone as string,
    role: (row.role as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    displayOrder: (row.display_order as number) ?? 0,
    createdAt: row.created_at as string,
  }
}

function mapShift(row: Record<string, unknown>): OnCallShift {
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    name: row.name as string,
    daysOfWeek: row.days_of_week as number[],
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    escalationSteps: row.escalation_steps as Array<{ contactId: string; waitMinutes: number | null }>,
    active: row.active as boolean,
    createdAt: row.created_at as string,
  }
}
