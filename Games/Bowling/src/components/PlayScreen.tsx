import { useCallback, useMemo, useState } from 'react'
import { useSidebarAction } from '../../../../shell'
import { isBumpersEnabled, setBumpersEnabled } from '../lib/bumpers'
import { DIFFICULTIES, THROWS_PER_GAME, type Difficulty } from '../lib/difficulty'
import { getHighScore, saveHighScoreIfBetter } from '../lib/highScore'
import { isSoundMuted, setSoundMuted } from '../lib/soundEffects'
import { BowlingCanvas } from './BowlingCanvas'
import { GameOverOverlay } from './GameOverOverlay'

interface PlayScreenProps {
  difficulty: Difficulty
  onPlayAgain: () => void
  onChangeDifficulty: () => void
}

export function PlayScreen({ difficulty, onPlayAgain, onChangeDifficulty }: PlayScreenProps) {
  const [throwScores, setThrowScores] = useState<number[]>([])
  const [gameComplete, setGameComplete] = useState(false)
  const [isNewBest, setIsNewBest] = useState(false)
  const [muted, setMuted] = useState(isSoundMuted())
  const [bumpers, setBumpers] = useState(isBumpersEnabled())

  const config = DIFFICULTIES[difficulty]
  const score = useMemo(() => throwScores.reduce((sum, n) => sum + n, 0), [throwScores])
  const best = getHighScore(difficulty)

  // Stable callbacks (functional updates, no closed-over state) — useSidebarAction re-registers
  // whenever onClick's identity changes, and since it reads the shared sidebar context, an
  // unstable onClick here would retrigger on every render forever.
  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      setSoundMuted(next)
      return next
    })
  }, [])
  const toggleBumpers = useCallback(() => {
    setBumpers((prev) => {
      const next = !prev
      setBumpersEnabled(next)
      return next
    })
  }, [])

  useSidebarAction({ id: 'bowling-change-difficulty', label: 'Difficulty', onClick: onChangeDifficulty })
  useSidebarAction({
    id: 'bowling-mute',
    label: muted ? 'Unmute' : 'Mute',
    pressed: muted,
    onClick: toggleMuted,
  })
  useSidebarAction({
    id: 'bowling-bumpers',
    label: 'Sideguard',
    pressed: bumpers,
    onClick: toggleBumpers,
  })

  function handleGameComplete(): void {
    // `score` closes over the freshest throwScores — the canvas always calls the latest version
    // of this callback (see BowlingCanvas's onGameCompleteRef), so it's never stale here even
    // though the 10th throw's score arrived in an earlier, separate state update.
    setIsNewBest(saveHighScoreIfBetter(difficulty, score))
    setGameComplete(true)
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-3 sm:justify-between">
        <div className="flex items-center gap-2 rounded-full bg-pz-surface px-4 py-2 shadow ring-1 ring-pz-ring">
          <span aria-hidden className="text-xl">
            {config.emoji}
          </span>
          <span className="font-bold text-pz-ink">{config.label}</span>
          <span className="text-xs font-semibold text-pz-ink-soft">Best: {best}</span>
        </div>

        <div className="flex flex-wrap justify-center gap-1 rounded-full bg-pz-surface px-3 py-2 shadow ring-1 ring-pz-ring">
          {Array.from({ length: THROWS_PER_GAME }, (_, i) => {
            const thrown = i < throwScores.length
            const isCurrent = i === throwScores.length && !gameComplete
            const isStrike = thrown && throwScores[i] === 10
            return (
              <span
                key={i}
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition',
                  isStrike
                    ? 'bg-pz-accent-strong text-pz-accent-ink'
                    : thrown
                      ? 'bg-pz-accent text-pz-accent-ink'
                      : isCurrent
                        ? 'scale-110 bg-pz-accent-soft text-pz-accent-strong'
                        : 'bg-pz-surface-soft text-pz-ink-faint',
                ].join(' ')}
              >
                {thrown ? throwScores[i] : '–'}
              </span>
            )
          })}
        </div>

        <div className="flex items-center gap-2 rounded-full bg-pz-surface px-4 py-2 shadow ring-1 ring-pz-ring">
          <span className="text-xs font-semibold tracking-wide text-pz-ink-soft uppercase">Score</span>
          <span className="text-xl font-bold text-pz-accent-strong">{score}</span>
        </div>
      </div>

      <p className="px-4 pb-1 text-center text-xs font-semibold text-pz-ink-soft">
        Drag back from the ball, then let go to bowl — pull sideways to curve it!
      </p>

      <div className="min-h-0 flex-1 px-3 pb-3">
        <BowlingCanvas
          laneLength={config.laneLength}
          bumpersEnabled={bumpers}
          onThrowComplete={(points) => setThrowScores((prev) => [...prev, points])}
          onGameComplete={handleGameComplete}
        />
      </div>

      {gameComplete && (
        <GameOverOverlay score={score} best={best} isNewBest={isNewBest} onPlayAgain={onPlayAgain} onChangeDifficulty={onChangeDifficulty} />
      )}
    </div>
  )
}
