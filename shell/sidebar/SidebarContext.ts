import { createContext, useContext, useEffect } from 'react'

/**
 * One button a game contributes to the shared sidebar. The shell owns the sidebar itself (home,
 * theme picker, layout); a game only ever adds to it, never replaces it.
 */
export interface SidebarAction {
  /** Stable across re-registrations, e.g. 'puzzler-hint' - keeps the button from reordering when it updates. */
  id: string
  label: string
  onClick: () => void
  /** Toggle-style buttons (like a Hint switch) light up when true. */
  pressed?: boolean
}

export interface SidebarContextValue {
  actions: SidebarAction[]
  register: (action: SidebarAction) => void
  unregister: (id: string) => void
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

function useSidebarContext(): SidebarContextValue {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebarAction must be used inside a GameShell')
  return context
}

/**
 * Adds a button to the shared sidebar for as long as the calling component is mounted. Pass
 * `null` to temporarily withdraw it (e.g. an action that only makes sense on some screens) without
 * unmounting the component that owns it.
 */
export function useSidebarAction(action: SidebarAction | null): void {
  const { register, unregister } = useSidebarContext()

  useEffect(() => {
    if (!action) return
    register(action)
    return () => unregister(action.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action?.id, action?.label, action?.pressed, action?.onClick])
}

export function useSidebarActions(): SidebarAction[] {
  return useSidebarContext().actions
}
