import type { Difficulty } from '../lib/difficulty'

export type Screen = 'menu' | 'playing'

export interface GameState {
  screen: Screen
  difficulty: Difficulty
  /** Bumped on every new map so a keyed remount regenerates the level and resets the run cleanly. */
  levelId: number
}

export type GameAction = { type: 'START'; difficulty: Difficulty } | { type: 'NEW_MAP' } | { type: 'CHANGE_DIFFICULTY' }

export const initialState: GameState = { screen: 'menu', difficulty: 'easy', levelId: 0 }

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
      return { screen: 'playing', difficulty: action.difficulty, levelId: state.levelId + 1 }
    case 'NEW_MAP':
      return { ...state, levelId: state.levelId + 1 }
    case 'CHANGE_DIFFICULTY':
      return { ...state, screen: 'menu' }
    default:
      return state
  }
}
