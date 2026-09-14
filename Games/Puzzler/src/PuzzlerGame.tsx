import { useReducer } from 'react'
import { CelebrationOverlay } from './components/CelebrationOverlay'
import { CountSelectScreen } from './components/CountSelectScreen'
import { SolvingScreen } from './components/SolvingScreen'
import { UploadScreen } from './components/UploadScreen'
import { initialState, puzzleReducer } from './state/puzzleState'

export function PuzzlerGame() {
  const [state, dispatch] = useReducer(puzzleReducer, initialState)

  switch (state.screen) {
    case 'upload':
      return (
        <UploadScreen
          error={state.error}
          onImageReady={(image) => dispatch({ type: 'IMAGE_LOADED', image })}
          onError={(message) => dispatch({ type: 'INGEST_ERROR', message })}
        />
      )

    case 'countSelect':
      return (
        <CountSelectScreen
          image={state.image}
          cuts={state.cuts}
          onSelectCount={(count) => dispatch({ type: 'SELECT_COUNT', count })}
          onNewImage={() => dispatch({ type: 'NEW_IMAGE' })}
        />
      )

    case 'solving':
      return (
        <SolvingScreen
          image={state.image}
          cut={state.cuts[state.count]}
          placed={state.placed}
          hint={state.hint}
          shuffleNonce={state.shuffleNonce}
          onPlacePiece={(row, col) => dispatch({ type: 'PLACE_PIECE', row, col })}
          onToggleHint={() => dispatch({ type: 'TOGGLE_HINT' })}
          onReset={() => dispatch({ type: 'RESET_PUZZLE' })}
          onNewImage={() => dispatch({ type: 'NEW_IMAGE' })}
        />
      )

    case 'complete':
      return (
        <>
          <SolvingScreen
            image={state.image}
            cut={state.cuts[state.count]}
            placed={new Set(state.cuts[state.count].pieces.map((p) => `${p.row}-${p.col}`))}
            hint={false}
            shuffleNonce={0}
            onPlacePiece={() => {}}
            onToggleHint={() => {}}
            onReset={() => {}}
            onNewImage={() => dispatch({ type: 'NEW_IMAGE' })}
          />
          <CelebrationOverlay
            onPlayAgain={() => dispatch({ type: 'PLAY_AGAIN' })}
            onNewImage={() => dispatch({ type: 'NEW_IMAGE' })}
          />
        </>
      )

    default:
      return null
  }
}
