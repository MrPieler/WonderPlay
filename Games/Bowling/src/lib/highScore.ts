import type { Difficulty } from './difficulty'

const STORAGE_KEY = 'wonderplay-bowling-high-scores'

type HighScores = Record<Difficulty, number>

function readAll(): HighScores {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HighScores>
      return { easy: 0, medium: 0, hard: 0, ...parsed }
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall back to session-only scores.
  }
  return { easy: 0, medium: 0, hard: 0 }
}

export function getHighScore(difficulty: Difficulty): number {
  return readAll()[difficulty]
}

/** Persists `score` as the new best for `difficulty` if it beats the stored one. Returns whether it did. */
export function saveHighScoreIfBetter(difficulty: Difficulty, score: number): boolean {
  const all = readAll()
  if (score <= all[difficulty]) return false
  all[difficulty] = score
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Ignore write failures — the in-memory game state still reflects the win this session.
  }
  return true
}
