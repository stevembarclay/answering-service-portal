// types/answeringService.ts
// Core domain types for the answering service customer portal.
// These form the adapter contract: telephony adapters must produce CallLog[]
// matching this shape. Do NOT change field names without a migration plan.

// ─── Priority & Status ─────────────────────────────────────────────────────

export type MessagePriority = 'high' | 'medium' | 'low'

/**
 * Status from the telephony system — what happened on the call.
 * Set by the adapter on ingest. Never modified by the portal.
 */
export type TelephonyStatus = 'completed' | 'missed' | 'voicemail'

/**
 * Status managed by the portal — what the business has done with the message.
 * Transitions: new → read → flagged_qa | assigned | resolved
 */
export type PortalStatus = 'new' | 'read' | 'flagged_qa' | 'assigned' | 'resolved'

// ─── Workflow Status ───────────────────────────────────────────────────────

export interface BusinessMessageStatus {
  id: string
  businessId: string
  label: string
  color: string               // hex, e.g. '#22c55e'
  isOpen: boolean             // true = open/active; false = closed/resolved
  sortOrder: number
  isSystem: boolean           // system statuses can be renamed but not deleted
}

// ─── Message Note ─────────────────────────────────────────────────────────

export interface MessageNote {
  id: string
  callLogId: string
  userId: string
  body: string
  createdAt: string           // ISO 8601
  updatedAt: string           // ISO 8601
}

// ─── Business User (for assign picker) ───────────────────────────────────

export interface BusinessUser {
  userId: string
  email: string
}

export interface AuditEvent {
  id: string
  businessId: string | null
  operatorOrgId: string | null
  userId: string | null
  eventType: 'phi_list' | 'phi_read' | 'phi_update' | 'login' | string
  resourceType: string | null
  resourceId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

// ─── Call Log ──────────────────────────────────────────────────────────────

export interface CallLog {
  id: string
  businessId: string
  timestamp: string           // ISO 8601
  callerName?: string
  callerNumber?: string       // masked or absent depending on operator config
  callbackNumber?: string
  callType: string            // slug matching wizard call types, e.g. 'urgent', 'new-client'
  direction: 'inbound' | 'outbound'
  durationSeconds: number     // 0 for missed calls and voicemails
  telephonyStatus: TelephonyStatus
  message: string             // agent's written note — the primary content
  recordingUrl?: string       // presigned URL generated fresh on each detail load; not stored in DB
  priority: MessagePriority   // system-assigned on ingest by call type rules; user-editable
  portalStatus: PortalStatus
  actions: MessageAction[]    // append-only audit log (WORM)
  isNew: boolean              // computed: timestamp > users_businesses.last_login_at for this user
  // Workflow fields (populated on detail load)
  workflowStatusId?: string | null
  workflowStatus?: BusinessMessageStatus | null
  assignedTo?: string | null           // user_id UUID
  assignedToEmail?: string | null      // resolved email for display
  notes: MessageNote[]                 // private — never visible to operators
}

// ─── Message Actions (audit trail) ────────────────────────────────────────

/**
 * Append-only audit log entry for actions taken on a CallLog.
 * Discriminated by `type` to enforce valid from/to values per action.
 */
export type MessageAction =
  | {
      id: string
      type: 'priority_updated'
      by: string               // UUID — user_id only, never email or display name
      at: string               // ISO 8601
      from: MessagePriority
      to: MessagePriority
    }
  | {
      id: string
      type: 'status_changed'
      by: string               // UUID — user_id only, never email or display name
      at: string               // ISO 8601
      from: PortalStatus
      to: PortalStatus
    }
  | {
      id: string
      type: 'flagged_qa'
      by: string               // UUID — user_id only, never email or display name
      at: string               // ISO 8601
    }
  | {
      id: string
      type: 'workflow_status_changed'
      by: string               // UUID — user_id only, never email or display name
      at: string               // ISO 8601
      from: string | null      // previous workflow_status_id (UUID or null)
      to: string | null        // new workflow_status_id (UUID or null)
    }
  | {
      id: string
      type: 'assigned'
      by: string               // UUID — user_id only, never email or display name
      at: string               // ISO 8601
      to: string | null        // assigned user_id (UUID or null = unassigned)
    }

// ─── Dashboard ────────────────────────────────────────────────────────────

export interface DashboardSummary {
  callsThisWeek: number
  callsLastWeek: number
  callsByDay: DayCount[]      // last 7 days for SVG sparkline
  unreadCount: number
  currentMonthEstimate: number      // cents — named to match spec field name exactly
  currentMonthCallCount: number
  daysRemainingInPeriod: number
  topUnreadMessages: CallLog[] // top 3, priority+timestamp sorted, portalStatus='new'
  callsByHour: HourCount[]          // last 30 days, all 24 hours present
  callTypeBreakdown: CallTypeCount[] // last 30 days, sorted by count desc
}

export interface DayCount {
  date: string                // YYYY-MM-DD
  count: number
}

export interface HourCount {
  hour: number        // 0–23 UTC hour of day
  count: number
}

export interface CallTypeCount {
  callType: string    // e.g. 'urgent', 'new-client', 'appointment'
  count: number
}

// ─── Billing ───────────────────────────────────────────────────────────────

export type BillingRuleType =
  | 'per_call'      // amount cents per call; zero-duration calls included
  | 'per_minute'    // amount cents per minute; zero-duration calls excluded
  | 'flat_monthly'  // amount cents, applied once per billing period
  | 'setup_fee'     // amount cents, applied only in the first billing period
  | 'bucket'        // included_minutes free, then overage_rate cents/min over

export interface BillingRule {
  id: string
  businessId: string
  type: BillingRuleType
  name: string                      // display name: "Monthly Maintenance Fee"
  amount: number                    // cents
  callTypeFilter?: string[]         // undefined = all call types; values are callType slugs
  timeColumn?: 'total' | 'inbound' | 'outbound' | 'work'  // default 'total'
  // bucket only:
  includedMinutes?: number
  overageRate?: number              // cents per minute over bucket
  active: boolean
}

export interface BillingLineItem {
  ruleId: string
  ruleName: string
  unitDescription: string           // e.g. "47 calls × $3.50"
  subtotalCents: number
}

export interface BillingEstimate {
  businessId: string
  periodStart: string               // ISO 8601
  periodEnd: string                 // ISO 8601
  asOf: string                      // ISO 8601 — when the estimate was calculated
  totalCents: number
  callCount: number
  lineItems: BillingLineItem[]
}

export interface BillingInvoice {
  id: string
  businessId: string
  periodStart: string               // ISO 8601
  periodEnd: string                 // ISO 8601
  status: 'open' | 'closed' | 'paid'
  totalCents: number
  callCount: number
  lineItems: BillingLineItem[]
  paidAt?: string                   // ISO 8601
  createdAt: string
  pdfUrl?: string
}
