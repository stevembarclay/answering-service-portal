import {
  closePeriod,
  batchClosePeriods,
  type ClosePeriodOptions,
} from '../monthCloseService'

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock('@/lib/utils/logger', () => ({
  createModuleLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }),
}))

// computeEstimate is pure — we let it run for real to test adjustment math
// but seed the mock DB with controlled usage + rule data.

const mockUpdate = jest.fn()
const mockSelectChain = jest.fn()

// Supabase client mock — returns controlled data for each table
const mockSupabase = {
  from: jest.fn(),
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OPERATOR_ORG_ID = 'org-1'
const PERIOD_ID = 'period-1'
const BUSINESS_ID = 'biz-1'
const USER_ID = 'user-1'

const OPEN_PERIOD = {
  id: PERIOD_ID,
  business_id: BUSINESS_ID,
  period_start: '2026-03-01T00:00:00.000Z',
  period_end: '2026-03-31T23:59:59.000Z',
  status: 'open' as const,
  total_cents: null,
  call_count: null,
  line_items: null,
  adjustment_cents: 0,
  adjustment_note: null,
  closed_by_user_id: null,
  closed_at: null,
  businesses: {
    name: 'ABC Medical',
    operator_org_id: OPERATOR_ORG_ID,
    created_at: '2025-01-01T00:00:00.000Z',
  },
}

const BILLING_RULE = {
  id: 'rule-1',
  business_id: BUSINESS_ID,
  type: 'per_call' as const,
  name: 'Per Call Fee',
  amount: 350,  // $3.50 per call
  call_type_filter: null,
  included_minutes: null,
  overage_rate: null,
  time_column: 'total',
  active: true,
}

const USAGE_PERIOD = {
  id: 'up-1',
  business_id: BUSINESS_ID,
  operator_org_id: OPERATOR_ORG_ID,
  period_date: '2026-03-10',
  total_calls: 10,
  total_minutes: '30',
  call_type_breakdown: {},
  source: 'csv_upload' as const,
  status: 'processed' as const,
  error_detail: null,
  raw_file_url: null,
  processed_at: '2026-03-11T00:00:00.000Z',
  created_at: '2026-03-11T00:00:00.000Z',
}

// 10 calls × $3.50 = $35.00 = 3500 cents
const EXPECTED_COMPUTED_CENTS = 3500

// ---------------------------------------------------------------------------
// Helper to set up the mock chain for closePeriod
// ---------------------------------------------------------------------------

function setupClosePeriodMocks(periodRow: typeof OPEN_PERIOD) {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'billing_periods') {
      // First call: load period (select with maybeSingle)
      // Second call: update (update + eq + eq + select + maybeSingle)
      const maybeSingleLoad = jest.fn().mockResolvedValue({ data: periodRow, error: null })
      const maybeSingleUpdate = jest.fn().mockResolvedValue({
        data: {
          ...periodRow,
          status: 'closed',
          total_cents: EXPECTED_COMPUTED_CENTS + (periodRow.adjustment_cents ?? 0),
          call_count: 10,
          line_items: [],
          closed_by_user_id: USER_ID,
          closed_at: '2026-04-01T00:00:00.000Z',
        },
        error: null,
      })

      let callCount = 0
      return {
        select: jest.fn(() => {
          callCount++
          if (callCount === 1) {
            // Load query
            return {
              eq: jest.fn().mockReturnThis(),
              maybeSingle: maybeSingleLoad,
            }
          }
          // Should not reach here via select chain for update
          return { eq: jest.fn().mockReturnThis(), maybeSingle: maybeSingleLoad }
        }),
        update: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          select: jest.fn(() => ({
            maybeSingle: maybeSingleUpdate,
          })),
        })),
      }
    }

    if (table === 'billing_rules') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          data: [BILLING_RULE],
          error: null,
          then: undefined,
        })),
      }
    }

    if (table === 'usage_periods') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockResolvedValue({ data: [USAGE_PERIOD], error: null }),
        })),
      }
    }

    return {}
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// closePeriod — adjustment math
// ---------------------------------------------------------------------------

describe('closePeriod — adjustment math', () => {
  it('recomputes total from rules + usage and stores computedTotal + adjustment', async () => {
    // Seed with 10 calls × $3.50 = $35.00 = 3500 cents (computed)
    // Apply a $50 credit (−5000 cents)
    // Expected final: 3500 − 5000 = −1500 cents
    // Note: negative totals are unusual but mathematically correct; the operator
    // would typically not apply a credit larger than the invoice.

    const updateFn = jest.fn().mockResolvedValue({
      data: null,  // will be overridden by full mock setup
      error: null,
    })

    let capturedUpdatePayload: Record<string, unknown> = {}

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_periods') {
        const maybeSingleLoad = jest.fn().mockResolvedValue({ data: OPEN_PERIOD, error: null })
        const maybeSingleUpdate = jest.fn().mockImplementation(async () => {
          return {
            data: {
              ...OPEN_PERIOD,
              status: 'closed',
              total_cents: capturedUpdatePayload.total_cents,
              adjustment_cents: capturedUpdatePayload.adjustment_cents,
              call_count: 10,
              line_items: [],
              closed_by_user_id: USER_ID,
              closed_at: '2026-04-01T00:00:00.000Z',
            },
            error: null,
          }
        })

        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            maybeSingle: maybeSingleLoad,
          })),
          update: jest.fn((payload: Record<string, unknown>) => {
            capturedUpdatePayload = payload
            return {
              eq: jest.fn().mockReturnThis(),
              select: jest.fn(() => ({
                maybeSingle: maybeSingleUpdate,
              })),
            }
          }),
        }
      }

      if (table === 'billing_rules') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            // Chain resolves to the data
            then: undefined,
            // Resolved by the lte mock — but billing_rules has no date filter,
            // so we resolve directly.
            data: [BILLING_RULE],
            error: null,
          })),
        }
      }

      if (table === 'usage_periods') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockResolvedValue({ data: [USAGE_PERIOD], error: null }),
          })),
        }
      }

      return {}
    })

    // billing_rules query resolves via the active eq chain
    // We need to make billing_rules promise resolve
    const rulesEqActive = jest.fn().mockResolvedValue({ data: [BILLING_RULE], error: null })
    const rulesEqBusiness = jest.fn().mockReturnValue({ eq: rulesEqActive })
    const rulesSelect = jest.fn().mockReturnValue({ eq: rulesEqBusiness })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_periods') {
        const maybeSingleLoad = jest.fn().mockResolvedValue({ data: OPEN_PERIOD, error: null })
        const maybeSingleUpdate = jest.fn().mockImplementation(async () => ({
          data: {
            ...OPEN_PERIOD,
            status: 'closed',
            total_cents: capturedUpdatePayload.total_cents,
            adjustment_cents: capturedUpdatePayload.adjustment_cents,
            call_count: 10,
            line_items: capturedUpdatePayload.line_items,
            closed_by_user_id: USER_ID,
            closed_at: '2026-04-01T00:00:00.000Z',
          },
          error: null,
        }))

        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            maybeSingle: maybeSingleLoad,
          })),
          update: jest.fn((payload: Record<string, unknown>) => {
            capturedUpdatePayload = payload
            return {
              eq: jest.fn().mockReturnThis(),
              select: jest.fn(() => ({ maybeSingle: maybeSingleUpdate })),
            }
          }),
        }
      }

      if (table === 'billing_rules') {
        return { select: rulesSelect }
      }

      if (table === 'usage_periods') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockResolvedValue({ data: [USAGE_PERIOD], error: null }),
          })),
        }
      }

      return {}
    })

    const opts: ClosePeriodOptions = {
      adjustmentCents: -5000,  // $50 credit
      adjustmentNote: 'Outage credit',
      closedByUserId: USER_ID,
    }

    const result = await closePeriod(PERIOD_ID, OPERATOR_ORG_ID, opts)

    // Verify the update was called with correct math
    expect(capturedUpdatePayload.adjustment_cents).toBe(-5000)
    expect(capturedUpdatePayload.adjustment_note).toBe('Outage credit')
    expect(capturedUpdatePayload.status).toBe('closed')
    expect(capturedUpdatePayload.closed_by_user_id).toBe(USER_ID)
    // total_cents = computedTotal (3500) + adjustment (-5000) = -1500
    expect(capturedUpdatePayload.total_cents).toBe(3500 + (-5000))

    // Result row should reflect the stored values
    expect(result.status).toBe('closed')
    expect(result.adjustmentCents).toBe(-5000)
  })

  it('stores zero adjustment when none provided', async () => {
    let capturedUpdatePayload: Record<string, unknown> = {}

    const rulesEqActive = jest.fn().mockResolvedValue({ data: [BILLING_RULE], error: null })
    const rulesEqBusiness = jest.fn().mockReturnValue({ eq: rulesEqActive })
    const rulesSelect = jest.fn().mockReturnValue({ eq: rulesEqBusiness })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_periods') {
        const maybeSingleLoad = jest.fn().mockResolvedValue({ data: OPEN_PERIOD, error: null })
        const maybeSingleUpdate = jest.fn().mockResolvedValue({
          data: { ...OPEN_PERIOD, status: 'closed', total_cents: 3500, adjustment_cents: 0 },
          error: null,
        })
        return {
          select: jest.fn(() => ({ eq: jest.fn().mockReturnThis(), maybeSingle: maybeSingleLoad })),
          update: jest.fn((payload: Record<string, unknown>) => {
            capturedUpdatePayload = payload
            return {
              eq: jest.fn().mockReturnThis(),
              select: jest.fn(() => ({ maybeSingle: maybeSingleUpdate })),
            }
          }),
        }
      }
      if (table === 'billing_rules') return { select: rulesSelect }
      if (table === 'usage_periods') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockResolvedValue({ data: [USAGE_PERIOD], error: null }),
          })),
        }
      }
      return {}
    })

    await closePeriod(PERIOD_ID, OPERATOR_ORG_ID, { closedByUserId: USER_ID })

    expect(capturedUpdatePayload.adjustment_cents).toBe(0)
    expect(capturedUpdatePayload.total_cents).toBe(EXPECTED_COMPUTED_CENTS)
  })

  it('throws ALREADY_CLOSED when period status is closed', async () => {
    const CLOSED_PERIOD = { ...OPEN_PERIOD, status: 'closed' as const }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_periods') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: CLOSED_PERIOD, error: null }),
          })),
          update: jest.fn(),
        }
      }
      return {}
    })

    const err = await closePeriod(PERIOD_ID, OPERATOR_ORG_ID, { closedByUserId: USER_ID }).catch((e) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error & { code: string }).code).toBe('ALREADY_CLOSED')
    expect(err.message).toMatch(/already closed/i)
  })

  it('throws ALREADY_CLOSED when period status is paid', async () => {
    const PAID_PERIOD = { ...OPEN_PERIOD, status: 'paid' as const }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_periods') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: PAID_PERIOD, error: null }),
          })),
          update: jest.fn(),
        }
      }
      return {}
    })

    const err = await closePeriod(PERIOD_ID, OPERATOR_ORG_ID, { closedByUserId: USER_ID }).catch((e) => e)
    expect((err as Error & { code: string }).code).toBe('ALREADY_CLOSED')
  })

  it('throws NOT_FOUND when period does not belong to operator', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_periods') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
          update: jest.fn(),
        }
      }
      return {}
    })

    const err = await closePeriod(PERIOD_ID, 'wrong-org', { closedByUserId: USER_ID }).catch((e) => e)
    expect((err as Error & { code: string }).code).toBe('NOT_FOUND')
  })

  it('throws ALREADY_CLOSED on race condition (0 rows updated)', async () => {
    const rulesEqActive = jest.fn().mockResolvedValue({ data: [BILLING_RULE], error: null })
    const rulesEqBusiness = jest.fn().mockReturnValue({ eq: rulesEqActive })
    const rulesSelect = jest.fn().mockReturnValue({ eq: rulesEqBusiness })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_periods') {
        const maybeSingleLoad = jest.fn().mockResolvedValue({ data: OPEN_PERIOD, error: null })
        // Race: update returns null (0 rows matched the status = 'open' condition)
        const maybeSingleUpdate = jest.fn().mockResolvedValue({ data: null, error: null })
        return {
          select: jest.fn(() => ({ eq: jest.fn().mockReturnThis(), maybeSingle: maybeSingleLoad })),
          update: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            select: jest.fn(() => ({ maybeSingle: maybeSingleUpdate })),
          })),
        }
      }
      if (table === 'billing_rules') return { select: rulesSelect }
      if (table === 'usage_periods') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockResolvedValue({ data: [USAGE_PERIOD], error: null }),
          })),
        }
      }
      return {}
    })

    const err = await closePeriod(PERIOD_ID, OPERATOR_ORG_ID, { closedByUserId: USER_ID }).catch((e) => e)
    expect((err as Error & { code: string }).code).toBe('ALREADY_CLOSED')
  })
})

// ---------------------------------------------------------------------------
// batchClosePeriods
// ---------------------------------------------------------------------------

describe('batchClosePeriods', () => {
  it('collects successes and failures across multiple period IDs', async () => {
    const PERIOD_2 = { ...OPEN_PERIOD, id: 'period-2' }

    let callIndex = 0
    const responses = [
      // period-1: closes successfully
      { data: OPEN_PERIOD, error: null },
      // period-2: DB error on load
      { data: null, error: { message: 'Connection error' } },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_periods') {
        const current = responses[callIndex++] ?? { data: null, error: null }
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue(current),
          })),
          update: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            select: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { ...OPEN_PERIOD, status: 'closed', total_cents: 3500 },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'billing_rules') {
        const rulesEqActive = jest.fn().mockResolvedValue({ data: [BILLING_RULE], error: null })
        return { select: jest.fn(() => ({ eq: jest.fn().mockReturnValue({ eq: rulesEqActive }) })) }
      }
      if (table === 'usage_periods') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockResolvedValue({ data: [USAGE_PERIOD], error: null }),
          })),
        }
      }
      return {}
    })

    const result = await batchClosePeriods([PERIOD_ID, PERIOD_2.id], OPERATOR_ORG_ID, USER_ID)

    expect(result.succeeded).toContain(PERIOD_ID)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].id).toBe(PERIOD_2.id)
  })

  it('treats ALREADY_CLOSED as a success (idempotent)', async () => {
    const CLOSED_PERIOD = { ...OPEN_PERIOD, status: 'closed' as const }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'billing_periods') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: CLOSED_PERIOD, error: null }),
          })),
          update: jest.fn(),
        }
      }
      return {}
    })

    const result = await batchClosePeriods([PERIOD_ID], OPERATOR_ORG_ID, USER_ID)

    expect(result.succeeded).toContain(PERIOD_ID)
    expect(result.failed).toHaveLength(0)
  })

  it('returns empty arrays for an empty period list', async () => {
    const result = await batchClosePeriods([], OPERATOR_ORG_ID, USER_ID)
    expect(result.succeeded).toHaveLength(0)
    expect(result.failed).toHaveLength(0)
  })
})
