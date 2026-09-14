import { Link } from 'react-router-dom'
import { ThemePicker } from '../theme/ThemePicker'
import { useSidebarActions } from './SidebarContext'

/**
 * The rail every game lives inside: a way home, the paint pot, and whatever buttons the current
 * game has added below a divider. Games never render their own version of this - they call
 * useSidebarAction instead, so the rail always looks and behaves the same everywhere.
 */
export function Sidebar() {
  const actions = useSidebarActions()

  return (
    <nav
      aria-label="Game menu"
      className="flex w-16 flex-none flex-col items-center gap-2 p-2 sm:w-20 sm:gap-3 sm:p-3"
    >
      <Link
        to="/"
        aria-label="WonderPlay home"
        title="WonderPlay home"
        className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-pz-surface text-2xl shadow ring-1 ring-pz-ring transition hover:scale-105 active:scale-95"
      >
        <span aria-hidden>🧩</span>
      </Link>

      <ThemePicker />

      {actions.length > 0 && <div aria-hidden className="my-1 h-px w-8 flex-none bg-pz-ring" />}

      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={action.onClick}
          aria-pressed={action.pressed}
          className={`w-full rounded-2xl px-1 py-3 text-xs font-semibold shadow ring-1 transition active:scale-95 sm:text-sm ${
            action.pressed
              ? 'bg-pz-accent text-pz-accent-ink ring-pz-accent'
              : 'bg-pz-surface text-pz-ink ring-pz-ring'
          }`}
        >
          {action.label}
        </button>
      ))}
    </nav>
  )
}
