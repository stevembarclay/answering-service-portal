import { computeHealthScore } from '@/lib/services/operator/operatorService'

const NOW = new Date('2026-03-11T12:00:00Z')

describe('computeHealthScore', () => {
  it('perfect score: recent login, no open high-priority, all reviewed, onboarded', () => {
    const score = computeHealthScore({
      daysSinceLastLogin: 3,
      openHighPriorityCount: 0,
      reviewedWithin7dPercent: 100,
      onboardingComplete: true,
      override: null,
    })
    expect(score.total).toBe(100)
    expect(score.loginRecency).toBe(40)
    expect(score.unresolvedHighPriority).toBe(30)
    expect(score.reviewedWithin7d).toBe(20)
    expect(score.onboardingComplete).toBe(10)
    expect(score.isOverride).toBe(false)
  })

  it('override value is returned as-is', () => {
    const score = computeHealthScore({
      daysSinceLastLogin: 60,
      openHighPriorityCount: 5,
      reviewedWithin7dPercent: 0,
      onboardingComplete: false,
      override: 72,
    })
    expect(score.total).toBe(72)
    expect(score.isOverride).toBe(true)
  })

  it('login recency: 8-14 days → 25 pts', () => {
    const score = computeHealthScore({
      daysSinceLastLogin: 10,
      openHighPriorityCount: 0,
      reviewedWithin7dPercent: 100,
      onboardingComplete: true,
      override: null,
    })
    expect(score.loginRecency).toBe(25)
    expect(score.total).toBe(85)
  })

  it('2 open high-priority → 15 pts', () => {
    const score = computeHealthScore({
      daysSinceLastLogin: 3,
      openHighPriorityCount: 2,
      reviewedWithin7dPercent: 100,
      onboardingComplete: true,
      override: null,
    })
    expect(score.unresolvedHighPriority).toBe(15)
  })

  it('60% reviewed → 10 pts', () => {
    const score = computeHealthScore({
      daysSinceLastLogin: 3,
      openHighPriorityCount: 0,
      reviewedWithin7dPercent: 60,
      onboardingComplete: true,
      override: null,
    })
    expect(score.reviewedWithin7d).toBe(10)
  })

  it('null lastLogin (never logged in) → 0 login pts', () => {
    const score = computeHealthScore({
      daysSinceLastLogin: null,
      openHighPriorityCount: 0,
      reviewedWithin7dPercent: 100,
      onboardingComplete: true,
      override: null,
    })
    expect(score.loginRecency).toBe(0)
  })

  // Boundary tests for reviewedWithin7d — catch off-by-one in >= vs > comparisons
  it('reviewedWithin7dPercent at 50% boundary → 10 pts (inclusive lower bound)', () => {
    const score = computeHealthScore({
      daysSinceLastLogin: 3, openHighPriorityCount: 0,
      reviewedWithin7dPercent: 50, onboardingComplete: true, override: null,
    })
    expect(score.reviewedWithin7d).toBe(10)
  })

  it('reviewedWithin7dPercent at 49% → 0 pts (just below 50% lower bound)', () => {
    const score = computeHealthScore({
      daysSinceLastLogin: 3, openHighPriorityCount: 0,
      reviewedWithin7dPercent: 49, onboardingComplete: true, override: null,
    })
    expect(score.reviewedWithin7d).toBe(0)
  })

  it('reviewedWithin7dPercent at 80% boundary → 20 pts (inclusive lower bound for top tier)', () => {
    const score = computeHealthScore({
      daysSinceLastLogin: 3, openHighPriorityCount: 0,
      reviewedWithin7dPercent: 80, onboardingComplete: true, override: null,
    })
    expect(score.reviewedWithin7d).toBe(20)
  })

  it('reviewedWithin7dPercent at 79% → 10 pts (just below 80% upper bound)', () => {
    const score = computeHealthScore({
      daysSinceLastLogin: 3, openHighPriorityCount: 0,
      reviewedWithin7dPercent: 79, onboardingComplete: true, override: null,
    })
    expect(score.reviewedWithin7d).toBe(10)
  })
})
