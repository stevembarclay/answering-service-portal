// types/operator.ts

export interface OperatorContext {
  operatorOrgId: string
  userId: string
  role: 'admin' | 'viewer'
}

export interface OperatorOrg {
  id: string
  name: string
  slug: string
  plan: 'trial' | 'pro' | 'enterprise'
  status: 'active' | 'suspended' | 'cancelled'
  branding: {
    logo_url?: string
    primary_color?: string
    secondary_color?: string
    custom_domain?: string
  }
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UsagePeriod {
  id: string
  businessId: string
  operatorOrgId: string
  periodDate: string          // YYYY-MM-DD
  totalCalls: number
  totalMinutes: number        // NUMERIC(10,2) from DB
  callTypeBreakdown: Record<string, {
    calls: number
    minutes: number             // legacy total/inbound (always present)
    inbound_minutes?: number    // new optional
    outbound_minutes?: number   // new optional
    work_minutes?: number       // new optional (talk + wrap-up)
  }>
  source: 'csv_upload' | 'api'
  status: 'pending' | 'processed' | 'error'
  errorDetail: { row?: number; issue?: string } | null
  rawFileUrl: string | null
  processedAt: string | null
  createdAt: string
}

export interface ApiKey {
  id: string
  businessId: string | null
  operatorOrgId: string | null
  label: string
  scopes: string[]
  allowedIps: string[] | null
  expiresAt: string | null
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export interface WebhookSubscription {
  id: string
  operatorOrgId: string
  url: string
  // secret is NEVER included in this type — write-only at DB level
  topics: string[]
  status: 'active' | 'paused' | 'failing'
  consecutiveFailureCount: number
  createdAt: string
  updatedAt: string
}

export interface WebhookDelivery {
  id: string
  subscriptionId: string
  topic: string
  payload: Record<string, unknown>
  responseStatus: number | null
  responseBody: string | null
  attemptNumber: number
  nextRetryAt: string | null
  deliveredAt: string | null
  createdAt: string
}

export interface ClientRow {
  id: string
  name: string
  domain?: string
  operatorOrgId: string
  healthScore: number
  isHealthScoreOverride: boolean
  lastLoginAt: string | null
  callsPerWeek: number
  billingPercent: number | null   // null if no bucket rule; 0–100+ otherwise
  churnedAt: string | null
}

export interface ClientHealthBreakdown {
  total: number
  loginRecency: number            // 0 | 10 | 25 | 40
  unresolvedHighPriority: number  // 0 | 15 | 30
  reviewedWithin7d: number        // 0 | 10 | 20
  onboardingComplete: number      // 0 | 10
  isOverride: boolean
}

export interface BillingRuleTemplate {
  id: string
  operatorOrgId: string
  name: string
  description?: string
  rules: Array<{
    type: string
    name: string
    amount: number
    active: boolean
    callTypeFilter?: string[]
    includedMinutes?: number
    overageRate?: number
  }>
  createdAt: string
  updatedAt: string
}

// ─── Analytics ─────────────────────────────────────────────────────────────

export type AnalyticsPeriod = '7d' | '30d' | '90d'

export interface OperatorAnalytics {
  period: AnalyticsPeriod
  callVolumeByDay: Array<{ date: string; count: number }>
  callsByHour: Array<{ hour: number; count: number }>
  callTypeBreakdown: Array<{ callType: string; count: number; pct: number }>
  totalCalls: number
  totalCallsLastPeriod: number
  missedCallRate: number
  activeBusinessCount: number
  totalBusinessCount: number
}

export interface ClientAnalyticsData {
  callTypeBreakdown: Array<{
    callType: string
    count: number
    avgDurationSeconds: number
  }>
  missedCallRate: number
  avgResponseTimeMinutes: number | null
  callsByMonth: Array<{ month: string; count: number }>
}
