import { Link } from 'react-router-dom'
import { GAMES } from '../games/registry'

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-8 p-6 text-center">
      <div className="flex flex-col items-center gap-2 pt-6">
        <h1 className="text-4xl font-bold text-pz-ink drop-shadow-sm sm:text-5xl">WonderPlay</h1>
        <p className="max-w-md text-pz-ink-soft">Pick a game to play!</p>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-2 gap-5 sm:grid-cols-3">
        {GAMES.map((game) => (
          <Link
            key={game.id}
            to={`/${game.path}`}
            className="flex flex-col items-center gap-3 rounded-3xl bg-pz-surface p-6 shadow ring-1 ring-pz-ring transition hover:scale-[1.02] hover:ring-2 hover:ring-pz-accent active:scale-95"
          >
            <span aria-hidden className="text-5xl">
              {game.icon}
            </span>
            <span className="text-xl font-bold text-pz-ink">{game.name}</span>
            <span className="text-sm text-pz-ink-soft">{game.tagline}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
