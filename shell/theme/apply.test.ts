import { describe, expect, test } from 'vitest'
import { applyTheme, cssVarName, resolveTheme } from './apply'
import { THEME_TOKENS, buildTokens, findColorFamily, toRgbTokens } from './colors'
import { DEFAULT_CHOICE } from './preference'
import { THEMES, findTheme } from './themes'

describe('resolveTheme', () => {
  test('resolves a valid choice to its theme and colour', () => {
    const resolved = resolveTheme({ themeId: 'dinos', colorId: 'grape' })
    expect(resolved.theme.id).toBe('dinos')
    expect(resolved.family.id).toBe('grape')
    expect(resolved.tokens).toEqual(toRgbTokens(buildTokens(findColorFamily('grape')!)))
  })

  test('falls back rather than crashing on an unknown choice', () => {
    const resolved = resolveTheme({ themeId: 'nope', colorId: 'nope' })
    expect(resolved.choice).toEqual(DEFAULT_CHOICE)
  })

  test('resolves every theme in every colour', () => {
    for (const theme of THEMES) {
      const resolved = resolveTheme({ themeId: theme.id, colorId: 'midnight' })
      expect(resolved.theme.id).toBe(theme.id)
      expect(resolved.family.id).toBe('midnight')
    }
  })
})

describe('applyTheme', () => {
  test('writes every token onto the element', () => {
    const element = document.createElement('div')
    const resolved = resolveTheme({ themeId: 'cars', colorId: 'fire' })
    applyTheme(element, resolved)

    for (const token of THEME_TOKENS) {
      expect(element.style.getPropertyValue(cssVarName(token)), token).toBe(resolved.tokens[token])
    }
  })

  test('swapping themes replaces the previous colours outright', () => {
    const element = document.createElement('div')
    applyTheme(element, resolveTheme({ themeId: 'cars', colorId: 'fire' }))
    const mint = resolveTheme({ themeId: 'ocean', colorId: 'mint' })
    applyTheme(element, mint)

    for (const token of THEME_TOKENS) {
      expect(element.style.getPropertyValue(cssVarName(token)), token).toBe(mint.tokens[token])
    }
  })

  test('tells the browser which scheme is on, so native chrome matches', () => {
    const element = document.createElement('div')
    applyTheme(element, resolveTheme({ themeId: 'space', colorId: 'midnight' }))
    expect(element.style.colorScheme).toBe('dark')

    applyTheme(element, resolveTheme({ themeId: 'space', colorId: 'sunshine' }))
    expect(element.style.colorScheme).toBe('light')
  })

  test('labels the element so CSS and tests can see the current look', () => {
    const element = document.createElement('div')
    applyTheme(element, resolveTheme({ themeId: 'pirates', colorId: 'sandy' }))
    expect(element.dataset.pzTheme).toBe('pirates')
    expect(element.dataset.pzColor).toBe('sandy')
  })

  test('every theme applies cleanly with its own default colour', () => {
    const element = document.createElement('div')
    for (const theme of THEMES) {
      const resolved = resolveTheme({ themeId: theme.id, colorId: findTheme(theme.id)!.defaultColor })
      expect(() => applyTheme(element, resolved)).not.toThrow()
      expect(element.style.getPropertyValue(cssVarName('bg'))).toBe(resolved.tokens.bg)
    }
  })
})
