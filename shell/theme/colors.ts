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

const OKLCH_PATTERN = /^oklch\((-?[\d.]+) ([\d.]+) (-?[\d.]+)(?: \/ ([\d.]+))?\)$/

/**
 * Converts an oklch() string to an equivalent rgb()/rgba() string (via the standard OKLab
 * round-trip: https://bottosson.github.io/posts/oklab/).
 *
 * The palette above is designed in OKLCH because it's the one space where "same lightness"
 * really does look equally light across every hue — that's what lets one recipe serve every
 * colour family. But oklch() the CSS *syntax* is a much newer addition than the colour space
 * itself, and isn't understood by every browser this app runs on: on an engine that can't parse
 * it, a background-color/fill using oklch() doesn't fall back to anything — it's simply invalid,
 * and the property collapses to black or transparent. That's silent and total: every themed
 * surface, every SVG illustration fill, every canvas fillStyle assignment breaks the same way,
 * on a device with no way to tell you why the page it's now grey and black.
 *
 * Converting here, at the boundary where a colour actually leaves this module for the DOM or a
 * canvas context, keeps the perceptual-lightness math everywhere above while guaranteeing every
 * colour that reaches the browser is a format every rendering engine has understood since CSS2.
 */
function oklchStringToRgb(value: string): string {
  const match = OKLCH_PATTERN.exec(value)
  if (!match) throw new Error(`not an oklch colour: ${value}`)
  const [, l, c, h, a] = match
  return oklchToRgbString(Number(l), Number(c), Number(h), a === undefined ? undefined : Number(a))
}

function oklchToRgbString(l: number, c: number, h: number, a?: number): string {
  const hRad = (h * Math.PI) / 180
  const labA = c * Math.cos(hRad)
  const labB = c * Math.sin(hRad)

  const l_ = l + 0.3963377774 * labA + 0.2158037573 * labB
  const m_ = l - 0.1055613458 * labA - 0.0638541728 * labB
  const s_ = l - 0.0894841775 * labA - 1.291485548 * labB

  const l3 = l_ ** 3
  const m3 = m_ ** 3
  const s3 = s_ ** 3

  const rLin = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3

  const r = linearToSrgbByte(rLin)
  const g = linearToSrgbByte(gLin)
  const b = linearToSrgbByte(bLin)

  return a === undefined ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`
}

/** Clamps into gamut (the recipe above can occasionally ask for a chroma sRGB can't reach) and
 *  applies the sRGB transfer function, landing on a 0-255 byte. */
function linearToSrgbByte(linear: number): number {
  const clamped = Math.min(1, Math.max(0, linear))
  const srgb = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055
  return Math.round(srgb * 255)
}

/** Every token, converted from this module's internal oklch() strings to rgb()/rgba() — what
 *  should actually reach a CSS custom property or a canvas fillStyle/strokeStyle. See
 *  oklchStringToRgb for why. */
export function toRgbTokens(tokens: ThemeTokens): ThemeTokens {
  return Object.fromEntries(THEME_TOKENS.map((token) => [token, oklchStringToRgb(tokens[token])])) as ThemeTokens
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

/** Five festive colours that still belong to the chosen family, for the winning confetti —
 *  rendered as DOM element backgrounds, so rgb() like every other exported colour. */
export function buildConfettiColors(family: ColorFamily): string[] {
  const lightness = family.scheme === 'dark' ? 0.78 : 0.7
  return [0, 42, -42, 150, 208].map((offset) => {
    const hue = (family.hue + offset + 360) % 360
    return oklchToRgbString(lightness, round(0.18 * Math.max(family.chroma, 0.8)), hue)
  })
}

/** The picker swatch: a little sweep through the family so each colour reads as a whole world. */
export function buildSwatchGradient(family: ColorFamily): string {
  const tokens = toRgbTokens(buildTokens(family))
  return `linear-gradient(135deg, ${tokens['bg-deep']} 0%, ${tokens.accent} 55%, ${tokens['accent-strong']} 100%)`
}
