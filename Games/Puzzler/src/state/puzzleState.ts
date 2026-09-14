import type { ProcessedImage } from '../lib/imageProcessor'
import { PIECE_COUNTS, buildPuzzleCut, type PieceCount, type PuzzleCut } from '../lib/puzzleCut'

export type AppState =
  | { screen: 'upload'; error: string | null }
  | { screen: 'countSelect'; image: ProcessedImage; seed: string; cuts: Record<PieceCount, PuzzleCut> }
  | {
      screen: 'solving'
      image: ProcessedImage
      seed: string
      cuts: Record<PieceCount, PuzzleCut>
      count: PieceCount
      placed: ReadonlySet<string>
      hint: boolean
      /** Bumped whenever the tray should reshuffle its display order (new solve, reset, play again). */
      shuffleNonce: number
    }
  | {
      screen: 'complete'
      image: ProcessedImage
      seed: string
      cuts: Record<PieceCount, PuzzleCut>
      count: PieceCount
    }

export type AppAction =
  | { type: 'IMAGE_LOADED'; image: ProcessedImage }
  | { type: 'INGEST_ERROR'; message: string }
  | { type: 'SELECT_COUNT'; count: PieceCount }
  | { type: 'PLACE_PIECE'; row: number; col: number }
  | { type: 'RESET_PUZZLE' }
  | { type: 'TOGGLE_HINT' }
  | { type: 'PLAY_AGAIN' }
  | { type: 'NEW_IMAGE' }

export const initialState: AppState = { screen: 'upload', error: null }

export function pieceId(row: number, col: number): string {
  return `${row}-${col}`
}

function generateSeed(): string {
  return Math.random().toString(36).slice(2)
}

function buildAllCuts(image: ProcessedImage, seed: string): Record<PieceCount, PuzzleCut> {
  return Object.fromEntries(
    PIECE_COUNTS.map((count) => [count, buildPuzzleCut(image.width, image.height, count, seed)]),
  ) as Record<PieceCount, PuzzleCut>
}

export function puzzleReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'IMAGE_LOADED': {
      const seed = generateSeed()
      return { screen: 'countSelect', image: action.image, seed, cuts: buildAllCuts(action.image, seed) }
    }

    case 'INGEST_ERROR':
      return { screen: 'upload', error: action.message }

    case 'SELECT_COUNT': {
      if (state.screen !== 'countSelect') return state
      return {
        screen: 'solving',
        image: state.image,
        seed: state.seed,
        cuts: state.cuts,
        count: action.count,
        placed: new Set(),
        hint: false,
        shuffleNonce: 0,
      }
    }

    case 'PLACE_PIECE': {
      if (state.screen !== 'solving') return state
      const placed = new Set(state.placed)
      placed.add(pieceId(action.row, action.col))

      const totalPieces = state.cuts[state.count].pieces.length
      if (placed.size === totalPieces) {
        return { screen: 'complete', image: state.image, seed: state.seed, cuts: state.cuts, count: state.count }
      }

      return { ...state, placed }
    }

    case 'RESET_PUZZLE': {
      if (state.screen !== 'solving') return state
      return { ...state, placed: new Set(), shuffleNonce: state.shuffleNonce + 1 }
    }

    case 'TOGGLE_HINT': {
      if (state.screen !== 'solving') return state
      return { ...state, hint: !state.hint }
    }

    case 'PLAY_AGAIN': {
      if (state.screen !== 'complete') return state
      const seed = generateSeed()
      return {
        screen: 'solving',
        image: state.image,
        seed,
        cuts: buildAllCuts(state.image, seed),
        count: state.count,
        placed: new Set(),
        hint: false,
        shuffleNonce: 0,
      }
    }

    case 'NEW_IMAGE':
      return { screen: 'upload', error: null }

    default:
      return state
  }
}
