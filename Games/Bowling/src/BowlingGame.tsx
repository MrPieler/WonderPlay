import { useReducer } from 'react'
import { DifficultyScreen } from './components/DifficultyScreen'
import { PlayScreen } from './components/PlayScreen'
import { gameReducer, initialState } from './state/gameState'

export function BowlingGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  if (state.screen === 'menu') {
    return <DifficultyScreen onSelect={(difficulty) => dispatch({ type: 'START', difficulty })} />
  }

  return (
    <PlayScreen
      key={`${state.difficulty}-${state.sessionId}`}
      difficulty={state.difficulty}
      onPlayAgain={() => dispatch({ type: 'PLAY_AGAIN' })}
      onChangeDifficulty={() => dispatch({ type: 'CHANGE_DIFFICULTY' })}
    />
  )
}
