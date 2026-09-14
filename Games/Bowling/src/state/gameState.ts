import type { Difficulty } from '../lib/difficulty'

export type Screen = 'menu' | 'playing'

export interface GameState {
  screen: Screen
  difficulty: Difficulty
  /** Bumped on every new game so a keyed remount resets the lane, pins and score cleanly. */
  sessionId: number
}

export type GameAction = { type: 'START'; difficulty: Difficulty } | { type: 'PLAY_AGAIN' } | { type: 'CHANGE_DIFFICULTY' }

export const initialState: GameState = { screen: 'menu', difficulty: 'easy', sessionId: 0 }

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
      return { screen: 'playing', difficulty: action.difficulty, sessionId: state.sessionId + 1 }
    case 'PLAY_AGAIN':
      return { ...state, sessionId: state.sessionId + 1 }
    case 'CHANGE_DIFFICULTY':
      return { ...state, screen: 'menu' }
    default:
      return state
  }
}
