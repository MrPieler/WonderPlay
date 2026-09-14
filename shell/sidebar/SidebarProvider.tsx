import { useMemo, useState, type ReactNode } from 'react'
import { SidebarContext, type SidebarAction, type SidebarContextValue } from './SidebarContext'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<SidebarAction[]>([])

  const register = (action: SidebarAction) => {
    setActions((previous) => {
      const index = previous.findIndex((existing) => existing.id === action.id)
      if (index === -1) return [...previous, action]
      // Update in place so an action that changes often (Hint's pressed state) doesn't jump around.
      const next = [...previous]
      next[index] = action
      return next
    })
  }

  const unregister = (id: string) => {
    setActions((previous) => previous.filter((existing) => existing.id !== id))
  }

  const value = useMemo<SidebarContextValue>(() => ({ actions, register, unregister }), [actions])

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}
