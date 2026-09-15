import type { ReactNode } from 'react'
import { ThemedBackdrop } from './theme/ThemedBackdrop'
import { Sidebar } from './sidebar/Sidebar'
import { SidebarProvider } from './sidebar/SidebarProvider'

interface GameShellProps {
  children: ReactNode
}

/**
 * The page frame every route (the landing page and every game) mounts into: the themed backdrop,
 * the sidebar, and a slot for whatever that route wants to fill the rest of the screen with. The
 * sidebar is scoped per-mount, so a game's buttons never linger after navigating away from it.
 *
 * The frame is exactly one viewport tall (h-dvh, not min-h-dvh) and clips its own overflow, so
 * every screen inside it can size itself with plain h-full and know what that means. Screens
 * whose content can legitimately outgrow the viewport - the menus, on a short phone held
 * sideways - scroll inside `main` rather than growing the page, since the page itself can't
 * scroll at all (see src/index.css).
 */
export function GameShell({ children }: GameShellProps) {
  return (
    <SidebarProvider>
      <ThemedBackdrop />
      <div className="flex h-dvh w-full overflow-hidden">
        <Sidebar />
        <main className="h-full min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </SidebarProvider>
  )
}
