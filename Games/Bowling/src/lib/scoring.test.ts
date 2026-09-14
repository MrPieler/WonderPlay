import { describe, expect, it } from 'vitest'
import { messageForPoints, throwPoints } from './scoring'

describe('throwPoints', () => {
  it('counts pins that went from standing to down', () => {
    expect(throwPoints(10, 3)).toBe(7)
  })

  it('is zero when nothing was knocked down', () => {
    expect(throwPoints(10, 10)).toBe(0)
  })

  it('clamps to 10 even if more pins were reported down than were standing', () => {
    expect(throwPoints(10, -2)).toBe(10)
  })

  it('never goes negative', () => {
    expect(throwPoints(3, 10)).toBe(0)
  })
})

describe('messageForPoints', () => {
  it('celebrates a strike', () => {
    expect(messageForPoints(10).tone).toBe('strike')
  })

  it('encourages a miss without being harsh', () => {
    expect(messageForPoints(0).tone).toBe('miss')
  })

  it('scales the message up with the pin count', () => {
    expect(messageForPoints(8).tone).toBe('great')
    expect(messageForPoints(5).tone).toBe('nice')
    expect(messageForPoints(2).tone).toBe('ok')
  })
})
