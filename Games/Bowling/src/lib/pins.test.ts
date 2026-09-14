import { describe, expect, it } from 'vitest'
import { buildPins, resetPins } from './pins'

describe('buildPins', () => {
  it('creates the standard ten-pin triangle, all standing', () => {
    const pins = buildPins(1000)
    expect(pins).toHaveLength(10)
    expect(pins.every((pin) => pin.state === 'standing')).toBe(true)
  })

  it('places the head pin at the lane length, nearest the bowler', () => {
    const pins = buildPins(1000)
    expect(pins[0].baseX).toBe(0)
    expect(pins[0].baseY).toBe(1000)
  })

  it('lays out four rows of 1/2/3/4 pins behind the head pin', () => {
    const pins = buildPins(1000)
    const byRow = new Map<number, number>()
    for (const pin of pins) byRow.set(pin.baseY, (byRow.get(pin.baseY) ?? 0) + 1)
    expect([...byRow.values()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4])
  })
})

describe('resetPins', () => {
  it('returns knocked-down pins to standing at their base position', () => {
    const pins = buildPins(1000)
    pins[0].state = 'down'
    pins[0].x = 999
    pins[0].fallTimer = 5

    resetPins(pins, 0.4)

    expect(pins[0].state).toBe('standing')
    expect(pins[0].x).toBe(pins[0].baseX)
    expect(pins[0].fallTimer).toBe(0)
    expect(pins[0].resetTimer).toBe(0.4)
  })
})
