import { useState } from 'react'
import { useSidebarAction } from '../../../../shell'
import { DIFFICULTIES, type Difficulty } from '../lib/difficulty'
import { BuzzWireCanvas } from './BuzzWireCanvas'
import { WinOverlay } from './WinOverlay'

interface PlayScreenProps {
  difficulty: Difficulty
  onNewMap: () => void
  onChangeDifficulty: () => void
}

export function PlayScreen({ difficulty, onNewMap, onChangeDifficulty }: PlayScreenProps) {
  const [won, setWon] = useState(false)
  const [buzzCount, setBuzzCount] = useState(0)
  const config = DIFFICULTIES[difficulty]

  useSidebarAction({ id: 'buzzwire-new-map', label: 'New Map', onClick: onNewMap })
  useSidebarAction({ id: 'buzzwire-difficulty', label: 'Change Difficulty', onClick: onChangeDifficulty })

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-2xl">
            {config.emoji}
          </span>
          <span className="font-bold text-pz-ink">{config.label}</span>
        </div>
        {buzzCount > 0 && (
          <span className="text-sm text-pz-ink-soft">
            Buzzed {buzzCount} {buzzCount === 1 ? 'time' : 'times'} — keep going!
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 px-3 pb-3">
        <BuzzWireCanvas difficulty={difficulty} onBuzz={() => setBuzzCount((n) => n + 1)} onWin={() => setWon(true)} />
      </div>

      {won && <WinOverlay onPlayAgain={onNewMap} onChangeDifficulty={onChangeDifficulty} />}
    </div>
  )
}
