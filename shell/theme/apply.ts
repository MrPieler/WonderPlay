/**
 * Turning a choice into live CSS. Every themed colour in the app is a --pz-* custom property on
 * <html>, so a swap is one batch of property writes — no reload, no re-render of the puzzle, and
 * a half-solved board keeps its pieces exactly where they were.
 */

import { THEME_TOKENS, buildConfettiColors, buildTokens, findColorFamily, toRgbTokens, type ColorFamily, type ThemeTokens } from './colors'
import { DEFAULT_CHOICE, type ThemeChoice } from './preference'
import { findTheme, type Theme } from './themes'

export interface ResolvedTheme {
  choice: ThemeChoice
  theme: Theme
  family: ColorFamily
  tokens: ThemeTokens
  confetti: string[]
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  const theme = findTheme(choice.themeId) ?? findTheme(DEFAULT_CHOICE.themeId)!
  const family = findColorFamily(choice.colorId) ?? findColorFamily(DEFAULT_CHOICE.colorId)!
  return {
    choice: { themeId: theme.id, colorId: family.id },
    theme,
    family,
    // rgb(), not the recipe's native oklch() — this is what actually reaches CSS custom
    // properties and canvas fillStyle/strokeStyle, both of which silently drop oklch() on
    // browsers that don't parse it (see toRgbTokens).
    tokens: toRgbTokens(buildTokens(family)),
    confetti: buildConfettiColors(family),
  }
}

export function cssVarName(token: string): string {
  return `--pz-${token}`
}

export function applyTheme(element: HTMLElement, resolved: ResolvedTheme): void {
  for (const token of THEME_TOKENS) {
    element.style.setProperty(cssVarName(token), resolved.tokens[token])
  }
  // Lets the browser paint form controls, scrollbars and the page behind the app to match.
  element.style.colorScheme = resolved.family.scheme
  element.dataset.pzTheme = resolved.theme.id
  element.dataset.pzColor = resolved.family.id
}
