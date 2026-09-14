import { describe, expect, test } from 'vitest'
import { DEFAULT_THEME_ID, SCENERY_KINDS, THEMES, findTheme } from './themes'
import { findColorFamily } from './colors'

describe('themes', () => {
  test('offers plenty of worlds to choose from', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(12)
  })

  test('covers the classics kids ask for', () => {
    const ids = THEMES.map((theme) => theme.id)
    for (const expected of ['cars', 'princess', 'unicorns', 'dinos', 'space']) {
      expect(ids).toContain(expected)
    }
  })

  test('has unique ids and names', () => {
    expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(THEMES.length)
    expect(new Set(THEMES.map((theme) => theme.name)).size).toBe(THEMES.length)
  })

  test('the default theme exists', () => {
    expect(findTheme(DEFAULT_THEME_ID)).toBeDefined()
  })

  for (const theme of THEMES) {
    describe(theme.id, () => {
      test('has a card icon and a readable name', () => {
        expect(theme.icon.length).toBeGreaterThan(0)
        expect(theme.name.trim()).toBe(theme.name)
        expect(theme.name.length).toBeGreaterThan(2)
      })

      test('uses a scenery the backdrop knows how to draw', () => {
        expect(SCENERY_KINDS).toContain(theme.scenery)
      })

      test('defaults to a colour that exists', () => {
        expect(findColorFamily(theme.defaultColor), theme.defaultColor).toBeDefined()
      })
    })
  }
})
