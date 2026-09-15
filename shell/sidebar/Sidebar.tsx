import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ThemePicker } from '../theme/ThemePicker'
import { useSidebarActions } from './SidebarContext'

const MIN_LABEL_FONT_SIZE = 8

/**
 * A sidebar action's label, still allowed to wrap onto a second line but shrunk whenever a
 * word is too wide for the button on its own - the rail is narrow (w-16/w-20) and games
 * register labels of very different lengths ("Mute" vs "Change Difficulty"), so a fixed size
 * either wastes space or lets a long word overflow the button.
 */
function FitLabel({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return

    function fit() {
      if (!el) return
      el.style.fontSize = ''
      el.style.overflowWrap = ''
      const naturalSize = parseFloat(window.getComputedStyle(el).fontSize)

      let size = naturalSize
      el.style.fontSize = `${size}px`
      while (el.scrollWidth > el.clientWidth && size > MIN_LABEL_FONT_SIZE) {
        size -= 1
        el.style.fontSize = `${size}px`
      }
      // Last resort for a single word that still doesn't fit at the smallest size: break it
      // mid-word instead of letting it overflow the button.
      if (el.scrollWidth > el.clientWidth) el.style.overflowWrap = 'break-word'
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [text])

  return (
    <span ref={ref} className="block w-full text-center">
      {text}
    </span>
  )
}

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
      className="flex w-16 flex-none flex-col items-center gap-2 overflow-y-auto overscroll-contain p-2 sm:w-20 sm:gap-3 sm:p-3"
    >
      <Link
        to="/"
        aria-label="WonderPlay home"
        title="WonderPlay home"
        className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-pz-surface text-2xl shadow ring-1 ring-pz-ring transition hover:scale-105 active:scale-95"
      >
        <span aria-hidden>🎮</span>
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
          <FitLabel text={action.label} />
        </button>
      ))}
    </nav>
  )
}
