import type { Grid } from './gridFactorizer'

export interface CellSize {
  width: number
  height: number
}

/**
 * Cell width/height for laying out a grid over a box of the given target
 * width, keeping the box's aspect ratio equal to the source image's own
 * aspect ratio. Cells are generally rectangular (not square) so the full
 * image is always shown undistorted and uncropped, whatever grid shape the
 * piece count needs.
 */
export function computeCellSize(imageWidth: number, imageHeight: number, grid: Grid, boxWidth: number): CellSize {
  const imageAspectRatio = imageWidth / imageHeight
  const width = boxWidth / grid.cols
  const height = boxWidth / imageAspectRatio / grid.rows
  return { width, height }
}
