import { parseCsvRows, validateRow } from '@/lib/services/operator/usageIngestService'

describe('parseCsvRows', () => {
  it('parses a minimal row', () => {
    const csv = 'date,business_id,total_calls,total_minutes\n2026-03-10,uuid-here,47,134.5'
    const rows = parseCsvRows(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      date: '2026-03-10',
      businessId: 'uuid-here',
      totalCalls: 47,
      totalMinutes: 134.5,
      callTypeBreakdown: {},
    })
  })

  it('parses call type columns', () => {
    const csv = 'date,business_id,total_calls,total_minutes,urgent_calls,urgent_minutes\n2026-03-10,uuid-here,3,12.0,3,12.0'
    const rows = parseCsvRows(csv)
    expect(rows[0].callTypeBreakdown).toEqual({ urgent: { calls: 3, minutes: 12 } })
  })

  it('last row wins for duplicate (business_id, date) within same CSV', () => {
    const csv = [
      'date,business_id,total_calls,total_minutes',
      '2026-03-10,uuid-here,47,134.5',
      '2026-03-10,uuid-here,50,140.0',
    ].join('\n')
    const rows = parseCsvRows(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].totalCalls).toBe(50)
  })

  it('skips blank lines', () => {
    const csv = 'date,business_id,total_calls,total_minutes\n\n2026-03-10,uuid-here,5,10\n'
    expect(parseCsvRows(csv)).toHaveLength(1)
  })
})

describe('validateRow', () => {
  it('passes a valid row', () => {
    const result = validateRow({ date: '2026-03-10', businessId: 'b-1', totalCalls: 5, totalMinutes: 10, callTypeBreakdown: {} }, ['b-1'])
    expect(result.valid).toBe(true)
  })

  it('fails on invalid date format', () => {
    const result = validateRow({ date: '03/10/2026', businessId: 'b-1', totalCalls: 5, totalMinutes: 10, callTypeBreakdown: {} }, ['b-1'])
    expect(result.valid).toBe(false)
    expect(result.issue).toMatch(/date/)
  })

  it('fails if business_id not in allowed set', () => {
    const result = validateRow({ date: '2026-03-10', businessId: 'unknown', totalCalls: 5, totalMinutes: 10, callTypeBreakdown: {} }, ['b-1'])
    expect(result.valid).toBe(false)
    expect(result.issue).toMatch(/business/)
  })

  it('fails on negative total_calls', () => {
    const result = validateRow({ date: '2026-03-10', businessId: 'b-1', totalCalls: -1, totalMinutes: 10, callTypeBreakdown: {} }, ['b-1'])
    expect(result.valid).toBe(false)
  })
})
