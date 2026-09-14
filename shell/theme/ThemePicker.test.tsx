import { afterEach, describe, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemePicker } from './ThemePicker'
import { ThemeProvider } from './ThemeProvider'
import { ThemedBackdrop } from './ThemedBackdrop'
import { buildTokens, findColorFamily } from './colors'
import { cssVarName } from './apply'
import { STORAGE_KEY } from './preference'
import { THEMES } from './themes'

function renderPicker(initial = { themeId: 'cars', colorId: 'fire' }) {
  return render(
    <ThemeProvider initialChoice={initial}>
      <ThemedBackdrop />
      <ThemePicker />
    </ThemeProvider>,
  )
}

function currentVar(token: string): string {
  return document.documentElement.style.getPropertyValue(cssVarName(token))
}

function openPicker() {
  fireEvent.click(screen.getByRole('button', { name: /change how the game looks/i }))
}

afterEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('style')
})

describe('ThemePicker', () => {
  test('paints the chosen look onto the page as soon as it mounts', () => {
    renderPicker({ themeId: 'space', colorId: 'midnight' })
    expect(currentVar('bg')).toBe(buildTokens(findColorFamily('midnight')!).bg)
    expect(document.documentElement.dataset.pzTheme).toBe('space')
  })

  test('stays out of the way until the paint pot is tapped', () => {
    renderPicker()
    expect(screen.queryByRole('dialog')).toBeNull()
    openPicker()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('offers every theme and marks the current one', () => {
    renderPicker({ themeId: 'unicorns', colorId: 'grape' })
    openPicker()

    for (const theme of THEMES) {
      expect(screen.getByRole('radio', { name: new RegExp(theme.name, 'i') })).toBeInTheDocument()
    }
    expect(screen.getByRole('radio', { name: /unicorns/i })).toHaveAttribute('aria-checked', 'true')
  })

  test('picking a world repaints the page and dresses it in that world colour', () => {
    renderPicker({ themeId: 'cars', colorId: 'fire' })
    openPicker()
    fireEvent.click(screen.getByRole('radio', { name: /under the sea/i }))

    expect(document.documentElement.dataset.pzTheme).toBe('ocean')
    expect(currentVar('bg')).toBe(buildTokens(findColorFamily('mint')!).bg)
  })

  test('picking a colour repaints without leaving the world', () => {
    renderPicker({ themeId: 'cars', colorId: 'fire' })
    openPicker()
    fireEvent.click(screen.getByRole('radio', { name: /grass green/i }))

    expect(document.documentElement.dataset.pzTheme).toBe('cars')
    expect(currentVar('accent')).toBe(buildTokens(findColorFamily('grass')!).accent)
  })

  test('the picker itself is repainted by the pick, so it never clashes with the new look', () => {
    renderPicker({ themeId: 'cars', colorId: 'fire' })
    openPicker()
    fireEvent.click(screen.getByRole('radio', { name: /midnight/i }))

    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  test('surprise me lands on a different look', () => {
    renderPicker({ themeId: 'cars', colorId: 'fire' })
    openPicker()
    fireEvent.click(screen.getByRole('button', { name: /surprise me/i }))

    expect(document.documentElement.dataset.pzTheme).not.toBe('cars')
    expect(document.documentElement.dataset.pzColor).not.toBe('fire')
  })

  test('remembers the pick for next time', () => {
    renderPicker({ themeId: 'cars', colorId: 'fire' })
    openPicker()
    fireEvent.click(screen.getByRole('radio', { name: /dinosaurs/i }))

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ themeId: 'dinos', colorId: 'grass' })
  })

  test('closes on the close button and on Escape', () => {
    renderPicker()
    openPicker()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByRole('dialog')).toBeNull()

    openPicker()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('the backdrop is decoration only: no clicks, no screen-reader noise', () => {
    const { container } = renderPicker()
    const backdrop = container.querySelector('[data-pz-backdrop]')!
    expect(backdrop).toHaveAttribute('aria-hidden')
    expect(backdrop.className).toContain('pointer-events-none')
  })

  test('every world can be picked without the backdrop falling over', () => {
    renderPicker()
    openPicker()
    for (const theme of THEMES) {
      fireEvent.click(screen.getByRole('radio', { name: new RegExp(theme.name, 'i') }))
      expect(document.documentElement.dataset.pzTheme).toBe(theme.id)
    }
  })
})
