import { useState } from 'react'
import { isBumpersEnabled, setBumpersEnabled } from '../lib/bumpers'
import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from '../lib/difficulty'
import { getHighScore } from '../lib/highScore'

interface DifficultyScreenProps {
  onSelect: (difficulty: Difficulty) => void
}

export function DifficultyScreen({ onSelect }: DifficultyScreenProps) {
  const [bumpers, setBumpers] = useState(isBumpersEnabled())

  function toggleBumpers(): void {
    const next = !bumpers
    setBumpersEnabled(next)
    setBumpers(next)
  }

  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain">
      <div className="flex min-h-full flex-col items-center justify-center gap-5 p-4 text-center sm:gap-8 sm:p-6">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold text-pz-ink drop-shadow-sm sm:text-5xl">🎳 Bowling</h1>
          <p className="max-w-md text-sm text-pz-ink-soft sm:text-base">
            Drag back from the ball and let go to bowl — pull sideways to curve your shot! Pick a lane and roll 10 throws.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={bumpers}
          onClick={toggleBumpers}
          className="flex items-center gap-3 rounded-full bg-pz-surface py-2 pr-4 pl-2 shadow ring-1 ring-pz-ring transition hover:ring-2 hover:ring-pz-accent active:scale-95"
        >
          <span
            className={[
              'flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors',
              bumpers ? 'justify-end bg-pz-accent' : 'justify-start bg-pz-surface-soft',
            ].join(' ')}
          >
            <span className="h-5 w-5 rounded-full bg-white shadow" />
          </span>
          <span className="text-left">
            <span className="block text-sm font-bold text-pz-ink">🛡️ Sideguards</span>
            <span className="block text-xs text-pz-ink-soft">
              {bumpers ? 'On — no gutter balls, great for little bowlers' : 'Off — gutters play for real'}
            </span>
          </span>
        </button>

        <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:gap-4">
          {DIFFICULTY_ORDER.map((id) => {
            const config = DIFFICULTIES[id]
            const best = getHighScore(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className="flex flex-1 flex-col items-center gap-2 rounded-3xl bg-pz-surface p-4 shadow ring-1 ring-pz-ring transition hover:scale-[1.03] hover:ring-2 hover:ring-pz-accent active:scale-95 sm:p-6"
              >
                <span aria-hidden className="text-4xl">
                  {config.emoji}
                </span>
                <span className="text-xl font-bold text-pz-ink">{config.label}</span>
                <span className="text-sm text-pz-ink-soft">{config.description}</span>
                {best > 0 && <span className="text-xs font-semibold text-pz-accent-strong">Best: {best}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
