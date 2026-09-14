import { describe, expect, test } from 'vitest'
import { gridFactorizer } from './gridFactorizer'

describe('gridFactorizer', () => {
  test('splits a square image into a square-ish grid', () => {
    const { rows, cols } = gridFactorizer(9, 1)
    expect(rows * cols).toBe(9)
    expect(rows).toBe(3)
    expect(cols).toBe(3)
  })

  test('orients a 3-piece grid as wide for a landscape image', () => {
    const { rows, cols } = gridFactorizer(3, 2)
    expect(rows * cols).toBe(3)
    expect(cols).toBeGreaterThan(rows)
  })

  test('orients a 3-piece grid as tall for a portrait image', () => {
    const { rows, cols } = gridFactorizer(3, 0.5)
    expect(rows * cols).toBe(3)
    expect(rows).toBeGreaterThan(cols)
  })

  const supportedCounts = [3, 6, 9, 12, 16]
  const aspectRatios = {
    square: 1,
    landscape: 16 / 9,
    portrait: 9 / 16,
    'extreme wide': 4,
    'extreme tall': 0.25,
  }

  for (const count of supportedCounts) {
    for (const [label, ratio] of Object.entries(aspectRatios)) {
      test(`count ${count} with a ${label} image produces a valid, consistently-oriented factor pair`, () => {
        const { rows, cols } = gridFactorizer(count, ratio)

        expect(rows * cols).toBe(count)
        expect(Number.isInteger(rows)).toBe(true)
        expect(Number.isInteger(cols)).toBe(true)

        if (cols !== rows) {
          const isWide = cols > rows
          const imageIsWide = ratio > 1
          if (ratio !== 1) {
            expect(isWide).toBe(imageIsWide)
          }
        }
      })
    }
  }
})
