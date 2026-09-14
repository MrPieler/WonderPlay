import { describe, expect, test } from 'vitest'
import {
  COLOR_FAMILIES,
  DEFAULT_COLOR_ID,
  THEME_TOKENS,
  buildConfettiColors,
  buildSwatchGradient,
  buildTokens,
  findColorFamily,
} from './colors'

const OKLCH = /^oklch\((-?[\d.]+) ([\d.]+) (-?[\d.]+)(?: \/ ([\d.]+))?\)$/

function parse(value: string) {
  const match = OKLCH.exec(value)
  if (!match) throw new Error(`not an oklch colour: ${value}`)
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]), a: match[4] ? Number(match[4]) : 1 }
}

describe('colour families', () => {
  test('offers a generous spread of colours with unique ids', () => {
    const ids = COLOR_FAMILIES.map((family) => family.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(COLOR_FAMILIES.length).toBeGreaterThanOrEqual(8)
  })

  test('includes both a light and a dark scheme so bedtime themes work too', () => {
    expect(COLOR_FAMILIES.some((family) => family.scheme === 'light')).toBe(true)
    expect(COLOR_FAMILIES.some((family) => family.scheme === 'dark')).toBe(true)
  })

  test('the default colour exists', () => {
    expect(findColorFamily(DEFAULT_COLOR_ID)).toBeDefined()
  })

  test('findColorFamily returns nothing for an unknown id', () => {
    expect(findColorFamily('chartreuse-banana')).toBeUndefined()
  })
})

describe('buildTokens', () => {
  for (const family of COLOR_FAMILIES) {
    describe(family.id, () => {
      const tokens = buildTokens(family)

      test('fills in every token with a valid oklch colour', () => {
        for (const token of THEME_TOKENS) {
          expect(tokens[token], token).toBeDefined()
          expect(() => parse(tokens[token]), token).not.toThrow()
        }
      })

      test('keeps text far enough from its background to stay readable', () => {
        const surface = parse(tokens.surface).l
        const bg = parse(tokens.bg).l
        for (const token of ['ink', 'ink-soft'] as const) {
          expect(Math.abs(parse(tokens[token]).l - surface), `${token} vs surface`).toBeGreaterThanOrEqual(0.42)
          expect(Math.abs(parse(tokens[token]).l - bg), `${token} vs bg`).toBeGreaterThanOrEqual(0.4)
        }
      })

      test('keeps button labels readable on the accent colour', () => {
        expect(Math.abs(parse(tokens['accent-ink']).l - parse(tokens.accent).l)).toBeGreaterThanOrEqual(0.35)
      })

      test('flips the label to dark ink when the accent itself is a light colour', () => {
        const accent = parse(tokens.accent).l
        const ink = parse(tokens['accent-ink']).l
        expect(accent > 0.66 ? ink < accent : ink > accent).toBe(true)
      })

      test('keeps the hover accent readable as text on a card', () => {
        const surface = parse(tokens.surface).l
        expect(Math.abs(parse(tokens['accent-strong']).l - surface)).toBeGreaterThanOrEqual(0.4)
      })

      test('puts every colour on the family hue', () => {
        for (const token of THEME_TOKENS) {
          expect(parse(tokens[token]).h, token).toBe(family.hue)
        }
      })

      test('orients light and dark schemes the right way round', () => {
        const surface = parse(tokens.surface).l
        const ink = parse(tokens.ink).l
        expect(family.scheme === 'light' ? surface > ink : ink > surface).toBe(true)
      })

      test('makes the socket overlays translucent so the photo hint shows through', () => {
        for (const token of ['socket-fill', 'socket-stroke', 'overlay'] as const) {
          expect(parse(tokens[token]).a, token).toBeLessThan(1)
        }
      })
    })
  }

  test('lets a family ask for a lighter accent, as a sunshine yellow needs', () => {
    const sunshine = COLOR_FAMILIES.find((family) => family.id === 'sunshine')!
    const tokens = buildTokens(sunshine)
    expect(parse(tokens.accent).l).toBeGreaterThan(0.75)
    expect(parse(tokens['accent-ink']).l).toBeLessThan(0.3)
    // The drop target highlight follows the accent, so it stays visible on the board.
    expect(parse(tokens['socket-active-stroke']).l).toBe(parse(tokens.accent).l)
  })

  test('gives different families different colours', () => {
    const backgrounds = COLOR_FAMILIES.map((family) => buildTokens(family).bg)
    expect(new Set(backgrounds).size).toBe(backgrounds.length)
  })
})

describe('celebration extras', () => {
  test('confetti gets five distinct colours per family', () => {
    for (const family of COLOR_FAMILIES) {
      const colors = buildConfettiColors(family)
      expect(colors).toHaveLength(5)
      expect(new Set(colors).size).toBe(5)
      for (const color of colors) expect(() => parse(color)).not.toThrow()
    }
  })

  test('swatches are a gradient through the family', () => {
    for (const family of COLOR_FAMILIES) {
      expect(buildSwatchGradient(family)).toContain('linear-gradient')
    }
  })
})
