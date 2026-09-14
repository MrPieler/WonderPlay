import type { ComponentType } from 'react'
import { BowlingGame } from '../../Games/Bowling/src/BowlingGame'
import { BuzzWireGame } from '../../Games/BuzzWire/src/BuzzWireGame'
import { PuzzlerGame } from '../../Games/Puzzler/src/PuzzlerGame'

export interface GameDefinition {
  id: string
  name: string
  tagline: string
  icon: string
  /** URL segment the game lives at, e.g. 'puzzler' -> /puzzler. No leading slash. */
  path: string
  component: ComponentType
}

/** Every playable game. Add an entry here to make a new game pickable from the landing page. */
export const GAMES: GameDefinition[] = [
  {
    id: 'puzzler',
    name: 'Puzzler',
    tagline: 'Turn any photo into a jigsaw puzzle',
    icon: '🧩',
    path: 'puzzler',
    component: PuzzlerGame,
  },
  {
    id: 'buzzwire',
    name: 'Buzz Wire',
    tagline: 'Steer the ring along the wire without touching it',
    icon: '🔌',
    path: 'buzzwire',
    component: BuzzWireGame,
  },
  {
    id: 'bowling',
    name: 'Bowling',
    tagline: 'Bowl 10 throws and beat your high score',
    icon: '🎳',
    path: 'bowling',
    component: BowlingGame,
  },
]
