/**
 * The public surface of the shell: everything a game needs from the central theme/sidebar module,
 * and nothing about how it's implemented underneath. Games should import from here, not by
 * reaching into shell/theme or shell/sidebar directly.
 */
export { GameShell } from './GameShell'
export { useTheme } from './theme/ThemeContext'
export type { ThemeContextValue } from './theme/ThemeContext'
export { ThemeProvider } from './theme/ThemeProvider'
export { useSidebarAction } from './sidebar/SidebarContext'
export type { SidebarAction } from './sidebar/SidebarContext'
