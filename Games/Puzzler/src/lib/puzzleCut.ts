import { gridFactorizer, type Grid } from './gridFactorizer'
import { jigsawPathGenerator, type Piece } from './jigsawPathGenerator'

export const PIECE_COUNTS = [3, 6, 9, 12, 16] as const
export type PieceCount = (typeof PIECE_COUNTS)[number]

export interface PuzzleCut {
  grid: Grid
  pieces: Piece[]
}

/**
 * Computes the full jigsaw cut (grid + pieces) for one image + count + seed.
 * The image itself is never cropped: `grid` only picks how the full,
 * original-aspect-ratio image is divided into rows/cols of (generally
 * rectangular) cells — see `computeCellSize`, which sizes those cells to
 * match the image's own aspect ratio at render time. Pure and deterministic.
 */
export function buildPuzzleCut(imageWidth: number, imageHeight: number, count: PieceCount, seed: string): PuzzleCut {
  const grid = gridFactorizer(count, imageWidth / imageHeight)
  const pieces = jigsawPathGenerator(grid.rows, grid.cols, `${seed}:${count}`)
  return { grid, pieces }
}
