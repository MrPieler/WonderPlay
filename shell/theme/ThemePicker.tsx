import { useEffect, useRef, useState } from 'react'
import { COLOR_FAMILIES, buildSwatchGradient } from './colors'
import { THEMES } from './themes'
import { useTheme } from './ThemeContext'

/**
 * The paint pot: a floating button that opens a sheet of worlds and colours. Everything is one
 * tap, nothing is confirmable or undoable, and the change lands the instant you touch it — a
 * four-year-old should be able to work the whole thing without reading a word of it.
 */
export function ThemePicker() {
  const { current, chooseTheme, chooseColor, surpriseMe } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const openButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen])

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Change how the game looks"
        title="Change how the game looks"
        className="z-40 flex h-12 w-12 flex-none items-center justify-center rounded-full bg-pz-surface text-2xl shadow-lg ring-2 ring-pz-ring transition hover:scale-105 active:scale-95"
      >
        <span aria-hidden>🎨</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pick how the game looks"
          className="fixed inset-0 z-50 flex items-end justify-center bg-pz-overlay p-3 sm:items-center sm:p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <div className="flex max-h-[88dvh] w-full max-w-3xl flex-col gap-4 overflow-y-auto overscroll-contain rounded-3xl bg-pz-surface p-5 shadow-2xl ring-1 ring-pz-ring">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-pz-ink sm:text-2xl">Pick a look!</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={surpriseMe}
                  className="rounded-full bg-pz-accent px-4 py-2 text-sm font-bold whitespace-nowrap text-pz-accent-ink shadow transition hover:bg-pz-accent-strong active:scale-95"
                >
                  <span aria-hidden>🎲 </span>Surprise me!
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    openButtonRef.current?.focus()
                  }}
                  aria-label="Close"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold text-pz-ink-soft ring-1 ring-pz-ring transition hover:bg-pz-surface-soft active:scale-95"
                >
                  <span aria-hidden>✕</span>
                </button>
              </div>
            </div>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold tracking-wide text-pz-ink-soft uppercase">Worlds</h3>
              <div
                role="radiogroup"
                aria-label="Theme"
                className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6"
              >
                {THEMES.map((theme) => {
                  const isSelected = theme.id === current.theme.id
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => chooseTheme(theme.id)}
                      className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-center transition active:scale-95 ${
                        isSelected
                          ? 'bg-pz-accent-soft ring-2 ring-pz-accent'
                          : 'bg-pz-surface-soft ring-1 ring-pz-ring hover:ring-2 hover:ring-pz-accent'
                      }`}
                    >
                      <span aria-hidden className="text-3xl leading-none">
                        {theme.icon}
                      </span>
                      <span className="text-xs leading-tight font-semibold text-pz-ink">{theme.name}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold tracking-wide text-pz-ink-soft uppercase">Colours</h3>
              <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-3">
                {COLOR_FAMILIES.map((family) => {
                  const isSelected = family.id === current.family.id
                  return (
                    <button
                      key={family.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => chooseColor(family.id)}
                      title={family.name}
                      className="flex w-16 flex-col items-center gap-1 transition active:scale-95"
                    >
                      <span
                        aria-hidden
                        className={`flex h-12 w-12 items-center justify-center rounded-full text-lg text-white shadow transition ${
                          isSelected
                            ? 'ring-4 ring-pz-ink ring-offset-2 ring-offset-pz-surface'
                            : 'ring-1 ring-pz-ring hover:scale-110'
                        }`}
                        style={{ backgroundImage: buildSwatchGradient(family) }}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                      <span className="text-[0.65rem] leading-tight font-semibold text-pz-ink-soft">
                        {family.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  )
}
