export interface AdapterTestResult {
  ok: boolean
  message: string
  latencyMs?: number
}

// ── On-call push types ──────────────────────────────────────────────────────

export interface OnCallAssignment {
  shiftName: string
  /** Shift start — required by StarTel (Add OnCall Assignment takes both start + end) */
  shiftStartsAt: Date
  shiftEndsAt: Date
  escalationSteps: Array<{
    step: number
    /** Human-readable name — for logging only, not sent to platform APIs */
    name: string
    /** For logging only — platforms reference contacts by numeric ID, not phone */
    phone: string
    role: string | null
    waitMinutes: number | null
    /**
     * StarTel CMC numeric member ID.
     * Required to push via "Add OnCall Assignment" — StarTel will not accept
     * a contact by name/phone, only by their internal integer member ID.
     * Stored on on_call_contacts.startel_member_id.
     */
    startelMemberId: number | null
    /**
     * Amtelco IS numeric contact index.
     * Required by AssignShift — Amtelco references contacts by contactIndex,
     * not by name or phone.
     * Stored on on_call_contacts.amtelco_contact_index.
     */
    amtelcoContactIndex: number | null
  }>
}

export interface PushResult {
  ok: boolean
  message: string
}

/**
 * Adapter contract for writing on-call assignments back to the operator's
 * call-center platform (StarTel CMC, Amtelco IS, etc.).
 *
 * Both StarTelAdapter and AmtelcoAdapter implement this interface.
 * The implementations are stubs until official API documentation is received.
 *
 * Trigger: called after any on-call shift or contact mutation so the
 * agent's interface reflects the latest schedule without manual re-entry.
 */
export interface IOnCallPushAdapter {
  pushOnCallAssignment(
    externalClientId: string,
    assignment: OnCallAssignment
  ): Promise<PushResult>
}

export type AdapterName = 'startel' | 'amtelco' | 'api_push' | 'zapier'
export type IngestSource = 'api' | 'csv' | 'startel' | 'amtelco' | 'zapier'

export interface IntegrationConfig {
  startel?: {
    base_url: string
    /**
     * Credential provisioned by StarTel support for this CMC installation.
     * The exact auth mechanism (Bearer token, custom header, session key pair, etc.)
     * is not publicly documented — do not hard-code the HTTP header format until
     * official API documentation is received.
     * Field may be renamed to session_key once auth format is confirmed.
     */
    api_key: string
    /**
     * Maps our canonical RawCallInput field names to the operator's IntelliForm field
     * names in their CMC dispatch script configuration.
     * Example: { "callerName": "CallerFirst", "callbackNumber": "PhoneNo", "message": "Notes" }
     * Configured once per operator during onboarding; stable day-to-day.
     */
    field_map?: Record<string, string>
    /**
     * Maps the operator's call-type field values to our callType slugs.
     * Example: { "Urgent": "urgent", "New Patient": "new-client", "General": "general" }
     * Values not in this map receive the fallback_call_type slug.
     */
    call_type_map?: Record<string, string>
    /**
     * Slug applied to call-type values that have no entry in call_type_map.
     * Defaults to 'general' if not set.
     */
    fallback_call_type?: string
    poll_interval_minutes?: number
  }
  amtelco?: {
    base_url: string
    username: string
    password: string
    /**
     * Maps our canonical RawCallInput field names to the operator's IS message field names.
     * Configured once per operator during onboarding.
     */
    field_map?: Record<string, string>
    /**
     * Maps the operator's message-type values to our callType slugs.
     * Values not in this map receive the fallback_call_type slug.
     */
    call_type_map?: Record<string, string>
    /**
     * Slug applied to message-type values that have no entry in call_type_map.
     * Defaults to 'general' if not set.
     */
    fallback_call_type?: string
    poll_interval_minutes?: number
  }
  data_freshness_alert_hours?: number
}

/**
 * Contract for any call source adapter.
 *
 * Push-based adapters (Zapier, direct API): the source calls our /api/v1/calls endpoint.
 * The ApiPushAdapter wraps the existing ingest path and implements this interface for
 * uniformity — callers treat all adapters the same.
 *
 * Pull-based adapters (StarTel native, Amtelco native): we call the source on a schedule.
 * fetchNewCalls() is the primary method; it is called by the cron ingest job.
 */
export interface ICallSourceAdapter {
  readonly name: AdapterName
  readonly operatorOrgId: string

  fetchNewCalls(
    since: Date
  ): Promise<import('@/lib/services/operator/callIngestService').RawCallInput[]>

  testConnection(): Promise<AdapterTestResult>

  configSummary(): string
}
