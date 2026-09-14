export type Difficulty = 'easy' | 'medium' | 'hard'

export interface DifficultyConfig {
  id: Difficulty
  label: string
  emoji: string
  description: string
  /** Distance from the foul line to the head pin — the only thing that changes between difficulties. */
  laneLength: number
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    emoji: '🟢',
    description: 'Close lane — perfect for beginners!',
    laneLength: 780,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    emoji: '🟡',
    description: 'Standard lane — a fair challenge!',
    laneLength: 1150,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    emoji: '🔴',
    description: 'Long lane — for bowling pros!',
    laneLength: 1600,
  },
}

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard']

export const THROWS_PER_GAME = 10
