import { createContext, useContext } from 'react'
import { resolveTheme, type ResolvedTheme } from './apply'
import { DEFAULT_CHOICE } from './preference'

export interface ThemeContextValue {
  current: ResolvedTheme
  /** Switch worlds (cars, unicorns…); the world brings its own colour along. */
  chooseTheme: (themeId: string) => void
  /** Repaint the current world in another colour. */
  chooseColor: (colorId: string) => void
  /** A brand new look, different from the one on screen. */
  surpriseMe: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  current: resolveTheme(DEFAULT_CHOICE),
  chooseTheme: () => {},
  chooseColor: () => {},
  surpriseMe: () => {},
})

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
