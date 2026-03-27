import { parseCsvCallRows, validateCallRow, type RawCallInput } from '../callIngestService'

describe('parseCsvCallRows', () => {
  const header = 'timestamp,business_id,caller_name,caller_number,callback_number,call_type,direction,duration_seconds,telephony_status,message'

  it('returns empty array for header-only CSV', () => {
    expect(parseCsvCallRows(header)).toEqual([])
  })

  it('parses a single valid row', () => {
    const csv = [
      header,
      '2026-03-10T14:30:00Z,biz-123,John Smith,555-1234,555-5678,urgent,inbound,180,completed,Patient calling about refill',
    ].join('\n')
    const rows = parseCsvCallRows(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      timestamp: '2026-03-10T14:30:00Z',
      businessId: 'biz-123',
      callerName: 'John Smith',
      callType: 'urgent',
      direction: 'inbound',
      durationSeconds: 180,
      telephonyStatus: 'completed',
      message: 'Patient calling about refill',
    })
  })

  it('skips rows with missing required fields', () => {
    const csv = [header, ',biz-123,,,,urgent,inbound,0,completed,msg'].join('\n')
    expect(parseCsvCallRows(csv)).toHaveLength(0)
  })

  it('handles optional caller_name and caller_number being absent', () => {
    const csv = [
      header,
      '2026-03-10T14:30:00Z,biz-123,,,, general-info,inbound,120,completed,Test message',
    ].join('\n')
    const rows = parseCsvCallRows(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0].callerName).toBeUndefined()
  })

  it('returns empty array when required headers are missing', () => {
    expect(parseCsvCallRows('date,business_id\n2026-01-01,biz-1')).toEqual([])
  })
})

describe('validateCallRow', () => {
  const validRow: RawCallInput = {
    timestamp: '2026-03-10T14:30:00Z',
    businessId: 'biz-123',
    callType: 'urgent',
    direction: 'inbound',
    durationSeconds: 180,
    telephonyStatus: 'completed',
    message: 'Test message',
  }

  it('accepts a valid row', () => {
    expect(validateCallRow(validRow, ['biz-123'])).toEqual({ valid: true })
  })

  it('rejects when businessId not in allowedIds', () => {
    const result = validateCallRow(validRow, ['other-biz'])
    expect(result.valid).toBe(false)
    expect(result.issue).toMatch(/does not belong/)
  })

  it('rejects empty message', () => {
    const result = validateCallRow({ ...validRow, message: '' }, ['biz-123'])
    expect(result.valid).toBe(false)
    expect(result.issue).toMatch(/message/)
  })

  it('rejects invalid direction', () => {
    const result = validateCallRow(
      { ...validRow, direction: 'sideways' as RawCallInput['direction'] },
      ['biz-123']
    )
    expect(result.valid).toBe(false)
  })

  it('rejects invalid telephonyStatus', () => {
    const result = validateCallRow(
      { ...validRow, telephonyStatus: 'ringing' as RawCallInput['telephonyStatus'] },
      ['biz-123']
    )
    expect(result.valid).toBe(false)
  })

  it('rejects negative durationSeconds', () => {
    const result = validateCallRow({ ...validRow, durationSeconds: -1 }, ['biz-123'])
    expect(result.valid).toBe(false)
  })

  it('rejects invalid timestamp format', () => {
    const result = validateCallRow({ ...validRow, timestamp: 'not-a-date' }, ['biz-123'])
    expect(result.valid).toBe(false)
  })
})
