import { checkBillingThresholds } from '@/lib/services/operator/usageIngestService'

describe('checkBillingThresholds', () => {
  it('detects crossing 75% threshold', () => {
    const crossed = checkBillingThresholds({
      previousMinutes: 70,
      newMinutes: 80,
      includedMinutes: 100,
    })
    expect(crossed).toEqual([75])
  })

  it('detects multiple thresholds crossed in one upload', () => {
    const crossed = checkBillingThresholds({
      previousMinutes: 60,
      newMinutes: 95,
      includedMinutes: 100,
    })
    expect(crossed).toEqual([75, 90])
  })

  it('detects 100% threshold', () => {
    const crossed = checkBillingThresholds({
      previousMinutes: 95,
      newMinutes: 102,
      includedMinutes: 100,
    })
    expect(crossed).toEqual([100])
  })

  it('returns empty if no threshold crossed', () => {
    const crossed = checkBillingThresholds({
      previousMinutes: 30,
      newMinutes: 50,
      includedMinutes: 100,
    })
    expect(crossed).toEqual([])
  })

  it('does not re-fire threshold if already above it before upload', () => {
    const crossed = checkBillingThresholds({
      previousMinutes: 85,
      newMinutes: 88,
      includedMinutes: 100,
    })
    expect(crossed).toEqual([])
  })
})
