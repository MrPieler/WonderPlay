/**
 * Colour families for the theme module.
 *
 * Every family is one hue plus a light/dark scheme. All the actual colour values are derived
 * from that hue by a fixed recipe (below), so any theme can be painted in any colour and still
 * keep the same readability: the recipe pins the perceptual lightness of each role, and only
 * the hue travels. Values are OKLCH, where lightness really is perceptual, which is what makes
 * one recipe safe across yellow and purple alike.
 */

export const THEME_TOKENS = [
  'bg',
  'bg-deep',
  'bg-glow',
  'surface',
  'surface-soft',
  'ring',
  'ink',
  'ink-soft',
  'ink-faint',
  'accent',
  'accent-strong',
  'accent-soft',
  'accent-ink',
  'tray',
  'board',
  'socket-fill',
  'socket-stroke',
  'socket-active-fill',
  'socket-active-stroke',
  'overlay',
  'shadow',
] as const

export type ThemeTokenName = (typeof THEME_TOKENS)[number]
export type ThemeTokens = Record<ThemeTokenName, string>

export type ColorScheme = 'light' | 'dark'

export interface ColorFamily {
  id: string
  /** Kid-facing name, shown under the swatch. */
  name: string
  hue: number
  scheme: ColorScheme
  /** Dials the whole family up or down in saturation (1 = the standard, punchy amount). */
  chroma: number
  /**
   * Overrides how light the accent is. Some hues (a proper sunshine yellow) are only themselves
   * when they are light, so they get to be light — and the label on top flips to dark ink to
   * match. See accentInkFor.
   */
  accentLightness?: number
}

/** lightness, chroma, optional alpha — chroma is multiplied by the family's own chroma dial. */
type Recipe = Record<ThemeTokenName, [l: number, c: number, a?: number]>

const LIGHT_RECIPE: Recipe = {
  bg: [0.965, 0.045],
  'bg-deep': [0.885, 0.085],
  'bg-glow': [0.99, 0.03],
  surface: [0.995, 0.008],
  'surface-soft': [0.955, 0.03],
  ring: [0.85, 0.06],
  ink: [0.34, 0.1],
  'ink-soft': [0.48, 0.08],
  'ink-faint': [0.62, 0.06],
  accent: [0.56, 0.17],
  'accent-strong': [0.47, 0.17],
  'accent-soft': [0.93, 0.06],
  'accent-ink': [0.99, 0.008],
  tray: [0.93, 0.045],
  board: [0.99, 0.008],
  'socket-fill': [0.34, 0.1, 0.07],
  'socket-stroke': [0.34, 0.1, 0.25],
  'socket-active-fill': [0.56, 0.17, 0.3],
  'socket-active-stroke': [0.56, 0.17],
  overlay: [0.3, 0.08, 0.62],
  shadow: [0.3, 0.08, 0.25],
}

const DARK_RECIPE: Recipe = {
  bg: [0.24, 0.045],
  'bg-deep': [0.13, 0.05],
  'bg-glow': [0.34, 0.07],
  surface: [0.3, 0.035],
  'surface-soft': [0.26, 0.03],
  ring: [0.45, 0.06],
  ink: [0.97, 0.015],
  'ink-soft': [0.84, 0.03],
  'ink-faint': [0.68, 0.04],
  accent: [0.74, 0.16],
  'accent-strong': [0.82, 0.15],
  'accent-soft': [0.34, 0.07],
  'accent-ink': [0.18, 0.05],
  tray: [0.27, 0.04],
  board: [0.32, 0.03],
  'socket-fill': [0.97, 0.015, 0.07],
  'socket-stroke': [0.97, 0.015, 0.28],
  'socket-active-fill': [0.74, 0.16, 0.3],
  'socket-active-stroke': [0.74, 0.16],
  overlay: [0.12, 0.05, 0.7],
  shadow: [0.05, 0.03, 0.4],
}

export const COLOR_FAMILIES: ColorFamily[] = [
  { id: 'sky', name: 'Sky Blue', hue: 240, scheme: 'light', chroma: 1 },
  { id: 'bubblegum', name: 'Bubblegum', hue: 355, scheme: 'light', chroma: 1 },
  { id: 'grape', name: 'Grape', hue: 300, scheme: 'light', chroma: 1 },
  { id: 'fire', name: 'Fire Red', hue: 27, scheme: 'light', chroma: 1.05 },
  { id: 'sunset', name: 'Sunset', hue: 58, scheme: 'light', chroma: 1.05 },
  { id: 'sunshine', name: 'Sunshine', hue: 95, scheme: 'light', chroma: 1, accentLightness: 0.85 },
  { id: 'grass', name: 'Grass Green', hue: 148, scheme: 'light', chroma: 1 },
  { id: 'mint', name: 'Minty Sea', hue: 195, scheme: 'light', chroma: 1 },
  { id: 'sandy', name: 'Sandy', hue: 75, scheme: 'light', chroma: 0.55, accentLightness: 0.68 },
  { id: 'midnight', name: 'Midnight', hue: 272, scheme: 'dark', chroma: 1 },
]

export const DEFAULT_COLOR_ID = 'sky'

export function findColorFamily(id: string): ColorFamily | undefined {
  return COLOR_FAMILIES.find((family) => family.id === id)
}

function oklch(hue: number, [l, c, a]: [number, number, number?], chromaDial: number): string {
  const chroma = round(c * chromaDial)
  return a === undefined ? `oklch(${l} ${chroma} ${hue})` : `oklch(${l} ${chroma} ${hue} / ${a})`
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** Below this the accent is dark enough for white labels; above it, labels go dark instead. */
const LIGHT_ACCENT_THRESHOLD = 0.66

/** The full set of CSS custom property values for one colour family. */
export function buildTokens(family: ColorFamily): ThemeTokens {
  const base = family.scheme === 'dark' ? DARK_RECIPE : LIGHT_RECIPE
  const recipe: Recipe = { ...base }

  if (family.accentLightness !== undefined) {
    const lightness = family.accentLightness
    recipe.accent = [lightness, base.accent[1]]
    recipe['socket-active-fill'] = [lightness, base['socket-active-fill'][1], base['socket-active-fill'][2]]
    recipe['socket-active-stroke'] = [lightness, base['socket-active-stroke'][1]]
  }
  recipe['accent-ink'] = accentInkFor(recipe.accent[0])

  return Object.fromEntries(
    THEME_TOKENS.map((token) => [token, oklch(family.hue, recipe[token], family.chroma)]),
  ) as ThemeTokens
}

/** Whatever the accent turns out to be, the label on it has to stay readable. */
function accentInkFor(accentLightness: number): [number, number] {
  return accentLightness >= LIGHT_ACCENT_THRESHOLD ? [0.2, 0.05] : [0.99, 0.008]
}

/** Five festive colours that still belong to the chosen family, for the winning confetti. */
export function buildConfettiColors(family: ColorFamily): string[] {
  const lightness = family.scheme === 'dark' ? 0.78 : 0.7
  return [0, 42, -42, 150, 208].map((offset) => {
    const hue = (family.hue + offset + 360) % 360
    return `oklch(${lightness} ${round(0.18 * Math.max(family.chroma, 0.8))} ${hue})`
  })
}

/** The picker swatch: a little sweep through the family so each colour reads as a whole world. */
export function buildSwatchGradient(family: ColorFamily): string {
  const tokens = buildTokens(family)
  return `linear-gradient(135deg, ${tokens['bg-deep']} 0%, ${tokens.accent} 55%, ${tokens['accent-strong']} 100%)`
}
