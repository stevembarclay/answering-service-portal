import { calculateNextRetryAt } from '@/lib/services/operator/webhookService'

describe('calculateNextRetryAt', () => {
  const base = new Date('2026-03-11T12:00:00Z')

  it('attempt 1: 1 minute', () => {
    const next = calculateNextRetryAt(1, base)
    expect(next?.getTime()! - base.getTime()).toBe(60_000)
  })

  it('attempt 4: 8 minutes', () => {
    const next = calculateNextRetryAt(4, base)
    expect(next?.getTime()! - base.getTime()).toBe(8 * 60_000)
  })

  it('attempt 7+: capped at 60 minutes', () => {
    const next7 = calculateNextRetryAt(7, base)
    expect(next7?.getTime()! - base.getTime()).toBe(60 * 60_000)
  })

  it('attempt 10 returns null (no more retries)', () => {
    expect(calculateNextRetryAt(10, base)).toBeNull()
  })
})
