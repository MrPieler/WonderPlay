import { describe, expect, test } from 'vitest'
import {
  DEFAULT_CHOICE,
  STORAGE_KEY,
  loadChoice,
  normalizeChoice,
  randomChoice,
  saveChoice,
  selectColor,
  selectTheme,
} from './preference'
import { COLOR_FAMILIES } from './colors'
import { THEMES, findTheme } from './themes'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

describe('normalizeChoice', () => {
  test('accepts a known theme and colour', () => {
    expect(normalizeChoice({ themeId: 'cars', colorId: 'grass' })).toEqual({ themeId: 'cars', colorId: 'grass' })
  })

  test('falls back to the default theme when the theme is unknown', () => {
    expect(normalizeChoice({ themeId: 'wizards', colorId: 'grass' }).themeId).toBe(DEFAULT_CHOICE.themeId)
  })

  test('falls back to the theme own colour when the colour is unknown', () => {
    expect(normalizeChoice({ themeId: 'cars', colorId: 'octarine' })).toEqual({
      themeId: 'cars',
      colorId: findTheme('cars')!.defaultColor,
    })
  })

  test.each([null, undefined, 42, 'cars', [], {}])('survives junk: %s', (value) => {
    expect(normalizeChoice(value)).toEqual(DEFAULT_CHOICE)
  })
})

describe('loadChoice / saveChoice', () => {
  test('remembers a saved choice', () => {
    const storage = fakeStorage()
    saveChoice({ themeId: 'space', colorId: 'midnight' }, storage)
    expect(loadChoice(storage)).toEqual({ themeId: 'space', colorId: 'midnight' })
  })

  test('uses the defaults on a first visit', () => {
    expect(loadChoice(fakeStorage())).toEqual(DEFAULT_CHOICE)
  })

  test('uses the defaults when the stored value is corrupt', () => {
    expect(loadChoice(fakeStorage({ [STORAGE_KEY]: '{not json' }))).toEqual(DEFAULT_CHOICE)
  })

  test('uses the defaults when storage is unavailable', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadChoice(blocked)).toEqual(DEFAULT_CHOICE)
  })

  test('a blocked write never throws at the child', () => {
    const blocked = {
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(() => saveChoice(DEFAULT_CHOICE, blocked)).not.toThrow()
  })
})

describe('picking', () => {
  test('picking a theme dresses it in the colour that theme was made for', () => {
    expect(selectTheme({ themeId: 'cars', colorId: 'mint' }, 'space')).toEqual({
      themeId: 'space',
      colorId: findTheme('space')!.defaultColor,
    })
  })

  test('picking an unknown theme changes nothing', () => {
    const choice = { themeId: 'cars', colorId: 'mint' }
    expect(selectTheme(choice, 'wizards')).toBe(choice)
  })

  test('picking a colour keeps the theme', () => {
    expect(selectColor({ themeId: 'cars', colorId: 'fire' }, 'grape')).toEqual({ themeId: 'cars', colorId: 'grape' })
  })

  test('every theme can be worn in every colour', () => {
    for (const theme of THEMES) {
      for (const family of COLOR_FAMILIES) {
        expect(selectColor({ themeId: theme.id, colorId: 'sky' }, family.id)).toEqual({
          themeId: theme.id,
          colorId: family.id,
        })
      }
    }
  })

  test('picking an unknown colour changes nothing', () => {
    const choice = { themeId: 'cars', colorId: 'fire' }
    expect(selectColor(choice, 'octarine')).toBe(choice)
  })
})

describe('randomChoice', () => {
  test('always lands on a real theme and colour', () => {
    let choice = DEFAULT_CHOICE
    for (let i = 0; i < 200; i++) {
      choice = randomChoice(choice)
      expect(findTheme(choice.themeId), choice.themeId).toBeDefined()
      expect(
        COLOR_FAMILIES.some((family) => family.id === choice.colorId),
        choice.colorId,
      ).toBe(true)
    }
  })

  test('never hands back the look already on screen', () => {
    let choice = DEFAULT_CHOICE
    for (let i = 0; i < 200; i++) {
      const next = randomChoice(choice)
      expect(next.themeId).not.toBe(choice.themeId)
      expect(next.colorId).not.toBe(choice.colorId)
      choice = next
    }
  })

  test('stays in range at the very top of the random sequence', () => {
    const choice = randomChoice(DEFAULT_CHOICE, () => 0.999999)
    expect(findTheme(choice.themeId)).toBeDefined()
  })
})
