import { useEffect, useMemo } from 'react'
import { useTheme } from '../../../../shell'
import { playStrike } from '../lib/soundEffects'

interface GameOverOverlayProps {
  score: number
  best: number
  isNewBest: boolean
  onPlayAgain: () => void
  onChangeDifficulty: () => void
}

export function GameOverOverlay({ score, best, isNewBest, onPlayAgain, onChangeDifficulty }: GameOverOverlayProps) {
  // Confetti in the theme's own colours, so a new best looks like the world the player chose.
  const { current } = useTheme()
  const confettiColors = current.confetti

  useEffect(() => {
    if (isNewBest) playStrike()
  }, [isNewBest])

  const confetti = useMemo(
    () =>
      isNewBest
        ? Array.from({ length: 50 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 0.6,
            duration: 2 + Math.random() * 1.5,
            color: confettiColors[i % confettiColors.length],
            rotate: Math.random() * 360,
          }))
        : [],
    [isNewBest, confettiColors],
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-hidden bg-pz-overlay p-6">
      {confetti.map((piece) => (
        <span
          key={piece.id}
          className="pointer-events-none absolute top-[-10px] h-3 w-2 rounded-sm"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotate}deg)`,
            animation: `bowling-confetti-fall ${piece.duration}s linear ${piece.delay}s 1`,
          }}
        />
      ))}

      <div className="relative flex flex-col items-center gap-3 rounded-2xl bg-pz-surface p-8 text-center shadow-2xl ring-1 ring-pz-ring">
        <h2 className="text-3xl font-bold text-pz-ink">{isNewBest ? 'Awesome! 🎉' : 'Game Over!'}</h2>
        <div className="text-5xl font-bold text-pz-accent-strong">{score}</div>
        <div className="text-sm font-semibold text-pz-ink-soft">Best: {best}</div>
        {isNewBest && (
          <div className="rounded-full bg-pz-accent-soft px-4 py-1.5 text-sm font-bold text-pz-accent-strong">
            🎉 New High Score! 🎉
          </div>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="rounded-full bg-pz-accent px-6 py-3 font-semibold text-pz-accent-ink shadow transition hover:bg-pz-accent-strong active:scale-95"
          >
            Play again
          </button>
          <button
            type="button"
            onClick={onChangeDifficulty}
            className="rounded-full bg-pz-surface px-6 py-3 font-semibold text-pz-ink shadow ring-1 ring-pz-ring transition hover:bg-pz-surface-soft active:scale-95"
          >
            Difficulty
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bowling-confetti-fall {
          from { transform: translateY(0) rotate(0deg); opacity: 1; }
          to { transform: translateY(100vh) rotate(360deg); opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
