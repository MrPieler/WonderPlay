export type Difficulty = 'easy' | 'medium' | 'hard'

export interface DifficultyConfig {
  id: Difficulty
  label: string
  emoji: string
  description: string
  /**
   * Max px the ring may stray from the wire's centerline before it buzzes — the only thing that
   * changes between difficulties. The map itself (length, curves, swerves) is the same for
   * everyone; see lib/mapConfig.ts.
   */
  tolerance: number
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    emoji: '🟢',
    description: 'A big, forgiving ring.',
    tolerance: 26,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    emoji: '🟡',
    description: 'A smaller ring — steadier hands needed.',
    tolerance: 19,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    emoji: '🔴',
    description: 'A tiny ring — almost no room for error!',
    tolerance: 13,
  },
}

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard']
