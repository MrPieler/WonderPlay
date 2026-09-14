import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from '../lib/difficulty'

interface DifficultyScreenProps {
  onSelect: (difficulty: Difficulty) => void
}

export function DifficultyScreen({ onSelect }: DifficultyScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold text-pz-ink drop-shadow-sm sm:text-5xl">Buzz Wire</h1>
        <p className="max-w-md text-pz-ink-soft">
          Drag the ring along the wire from start to finish. Touch the wire and it buzzes you back to the start! Every
          wire twists and turns the same way — pick how big a ring you want to thread it with.
        </p>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-4 sm:flex-row">
        {DIFFICULTY_ORDER.map((id) => {
          const config = DIFFICULTIES[id]
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className="flex flex-1 flex-col items-center gap-2 rounded-3xl bg-pz-surface p-6 shadow ring-1 ring-pz-ring transition hover:scale-[1.03] hover:ring-2 hover:ring-pz-accent active:scale-95"
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
  )
}
