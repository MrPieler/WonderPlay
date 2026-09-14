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
 */
export function GameShell({ children }: GameShellProps) {
  return (
    <SidebarProvider>
      <ThemedBackdrop />
      <div className="flex min-h-dvh">
        <Sidebar />
        <main className="min-h-dvh min-w-0 flex-1">{children}</main>
      </div>
    </SidebarProvider>
  )
}
