import { Link } from 'react-router-dom'
import { GAMES } from '../games/registry'

export function LandingPage() {
  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain">
      <div className="flex min-h-full flex-col items-center justify-center gap-6 p-4 text-center sm:gap-8 sm:p-6">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold text-pz-ink drop-shadow-sm sm:text-5xl">WonderPlay</h1>
          <p className="max-w-md text-pz-ink-soft">Pick a game to play!</p>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
          {GAMES.map((game) => (
            <Link
              key={game.id}
              to={`/${game.path}`}
              className="flex flex-col items-center gap-2 rounded-3xl bg-pz-surface p-4 shadow ring-1 ring-pz-ring transition hover:scale-[1.02] hover:ring-2 hover:ring-pz-accent active:scale-95 sm:gap-3 sm:p-6"
            >
              <span aria-hidden className="text-4xl sm:text-5xl">
                {game.icon}
              </span>
              <span className="text-lg font-bold text-pz-ink sm:text-xl">{game.name}</span>
              <span className="text-xs text-pz-ink-soft sm:text-sm">{game.tagline}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
