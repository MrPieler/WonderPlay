import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from '../lib/difficulty'

interface DifficultyScreenProps {
  onSelect: (difficulty: Difficulty) => void
}

export function DifficultyScreen({ onSelect }: DifficultyScreenProps) {
  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain">
      <div className="flex min-h-full flex-col items-center justify-center gap-6 p-4 text-center sm:gap-8 sm:p-6">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold text-pz-ink drop-shadow-sm sm:text-5xl">Buzz Wire</h1>
          <p className="max-w-md text-sm text-pz-ink-soft sm:text-base">
            Drag the ring along the wire from start to finish. Touch the wire and it buzzes you back to the start! Every
            wire twists and turns the same way — pick how big a ring you want to thread it with.
          </p>
        </div>

        <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:gap-4">
          {DIFFICULTY_ORDER.map((id) => {
            const config = DIFFICULTIES[id]
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
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
