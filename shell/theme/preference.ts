/**
 * What the child picked, and remembering it between visits. Anything unrecognised (an old
 * build's theme id, hand-edited storage, a blocked localStorage) falls back to the defaults
 * rather than throwing — a broken preference must never cost anyone their puzzle.
 */

import { COLOR_FAMILIES, DEFAULT_COLOR_ID, findColorFamily } from './colors'
import { DEFAULT_THEME_ID, THEMES, findTheme } from './themes'

export interface ThemeChoice {
  themeId: string
  colorId: string
}

export const STORAGE_KEY = 'puzzler.theme.v1'

export const DEFAULT_CHOICE: ThemeChoice = {
  themeId: DEFAULT_THEME_ID,
  // The default theme wears its own colour, so a first visit looks as deliberate as any pick.
  colorId: findTheme(DEFAULT_THEME_ID)?.defaultColor ?? DEFAULT_COLOR_ID,
}

export function normalizeChoice(value: unknown): ThemeChoice {
  if (typeof value !== 'object' || value === null) return DEFAULT_CHOICE
  const candidate = value as Partial<Record<keyof ThemeChoice, unknown>>
  const themeId = typeof candidate.themeId === 'string' && findTheme(candidate.themeId) ? candidate.themeId : DEFAULT_THEME_ID
  const colorId =
    typeof candidate.colorId === 'string' && findColorFamily(candidate.colorId)
      ? candidate.colorId
      : (findTheme(themeId)?.defaultColor ?? DEFAULT_COLOR_ID)
  return { themeId, colorId }
}

type ReadableStorage = Pick<Storage, 'getItem'>
type WritableStorage = Pick<Storage, 'setItem'>

export function loadChoice(storage: ReadableStorage | undefined = safeStorage()): ThemeChoice {
  if (!storage) return DEFAULT_CHOICE
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw === null ? DEFAULT_CHOICE : normalizeChoice(JSON.parse(raw))
  } catch {
    return DEFAULT_CHOICE
  }
}

export function saveChoice(choice: ThemeChoice, storage: WritableStorage | undefined = safeStorage()): void {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(choice))
  } catch {
    // Private-browsing or a full quota: the look just won't be remembered next time.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

/** Picking a world also puts on that world's best colour; the colour row can then override it. */
export function selectTheme(choice: ThemeChoice, themeId: string): ThemeChoice {
  const theme = findTheme(themeId)
  if (!theme) return choice
  return { themeId: theme.id, colorId: theme.defaultColor }
}

export function selectColor(choice: ThemeChoice, colorId: string): ThemeChoice {
  return findColorFamily(colorId) ? { ...choice, colorId } : choice
}

/** "Surprise me!" — a different look from the current one, every time. */
export function randomChoice(current: ThemeChoice, random: () => number = Math.random): ThemeChoice {
  const themes = THEMES.filter((theme) => theme.id !== current.themeId)
  const colors = COLOR_FAMILIES.filter((family) => family.id !== current.colorId)
  return {
    themeId: themes[Math.floor(random() * themes.length)].id,
    colorId: colors[Math.floor(random() * colors.length)].id,
  }
}
