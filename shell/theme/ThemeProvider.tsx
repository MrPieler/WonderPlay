import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { applyTheme, resolveTheme } from './apply'
import { loadChoice, randomChoice, saveChoice, selectColor, selectTheme, type ThemeChoice } from './preference'
import { ThemeContext, type ThemeContextValue } from './ThemeContext'

interface ThemeProviderProps {
  children: ReactNode
  /** Escape hatch for tests and screenshots: start on a known look instead of the saved one. */
  initialChoice?: ThemeChoice
}

export function ThemeProvider({ children, initialChoice }: ThemeProviderProps) {
  const [choice, setChoice] = useState<ThemeChoice>(() => initialChoice ?? loadChoice())
  const current = useMemo(() => resolveTheme(choice), [choice])

  // Layout effect, not a plain effect: the new colours must land in the same frame as the click,
  // or the swap flashes the old palette on the way through.
  useLayoutEffect(() => {
    applyTheme(document.documentElement, current)
    saveChoice(current.choice)
  }, [current])

  const chooseTheme = useCallback((themeId: string) => setChoice((previous) => selectTheme(previous, themeId)), [])
  const chooseColor = useCallback((colorId: string) => setChoice((previous) => selectColor(previous, colorId)), [])
  const surpriseMe = useCallback(() => setChoice((previous) => randomChoice(previous)), [])

  const value = useMemo<ThemeContextValue>(
    () => ({ current, chooseTheme, chooseColor, surpriseMe }),
    [current, chooseTheme, chooseColor, surpriseMe],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
