import type { MessagePriority } from '@/types/answeringService'

export type PriorityMap = Record<string, MessagePriority>

/** Default fallback priorities for common call type slugs. */
const DEFAULT_PRIORITY_MAP: PriorityMap = {
  urgent: 'high',
  emergency: 'high',
  'after-hours': 'high',
  afterhours: 'high',
  'new-client': 'medium',
  new_client: 'medium',
  appointment: 'medium',
  callback: 'medium',
  billing: 'medium',
}

/**
 * Build a PriorityMap from a call type config array (from wizard_data.callTypes).
 * Call types without an explicit priority are omitted — the default map handles them.
 */
export function buildPriorityMap(
  config: Array<{ id: string; priority?: MessagePriority }>
): PriorityMap {
  const map: PriorityMap = {}
  for (const type of config) {
    if (type.priority) map[type.id] = type.priority
  }
  return map
}

/**
 * Assign a priority to an incoming call based on its callType slug.
 *
 * @param callType - The call type slug from the inbound record.
 * @param customMap - Optional per-business overrides (from buildPriorityMap).
 *                    If provided, custom entries are checked first, then defaults.
 * @returns MessagePriority — never throws.
 */
export function assignPriority(callType: string, customMap?: PriorityMap): MessagePriority {
  const normalized = callType.toLowerCase().trim()
  if (customMap?.[normalized]) return customMap[normalized]
  return DEFAULT_PRIORITY_MAP[normalized] ?? 'low'
}
