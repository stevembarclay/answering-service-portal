import { assignPriority, buildPriorityMap, type PriorityMap } from '../priorityEngine'

describe('assignPriority (default fallback)', () => {
  it('maps urgent to high', () => {
    expect(assignPriority('urgent')).toBe('high')
  })

  it('maps emergency to high', () => {
    expect(assignPriority('emergency')).toBe('high')
  })

  it('maps after-hours to high', () => {
    expect(assignPriority('after-hours')).toBe('high')
  })

  it('maps new-client to medium', () => {
    expect(assignPriority('new-client')).toBe('medium')
  })

  it('maps appointment to medium', () => {
    expect(assignPriority('appointment')).toBe('medium')
  })

  it('maps unknown types to low', () => {
    expect(assignPriority('general-info')).toBe('low')
    expect(assignPriority('whatever')).toBe('low')
    expect(assignPriority('')).toBe('low')
  })

  it('is case-insensitive', () => {
    expect(assignPriority('URGENT')).toBe('high')
    expect(assignPriority('New-Client')).toBe('medium')
  })
})

describe('assignPriority with custom map', () => {
  const customMap: PriorityMap = {
    'vip-caller': 'high',
    'routine': 'low',
  }

  it('uses custom map when provided', () => {
    expect(assignPriority('vip-caller', customMap)).toBe('high')
    expect(assignPriority('routine', customMap)).toBe('low')
  })

  it('falls back to default for types not in custom map', () => {
    expect(assignPriority('urgent', customMap)).toBe('high')
    expect(assignPriority('general-info', customMap)).toBe('low')
  })
})

describe('buildPriorityMap', () => {
  it('builds a map from call type config array', () => {
    const config = [
      { id: 'custom-urgent', priority: 'high' as const },
      { id: 'routine-check', priority: 'low' as const },
    ]
    const map = buildPriorityMap(config)
    expect(map['custom-urgent']).toBe('high')
    expect(map['routine-check']).toBe('low')
  })

  it('returns empty object for empty config', () => {
    expect(buildPriorityMap([])).toEqual({})
  })
})
