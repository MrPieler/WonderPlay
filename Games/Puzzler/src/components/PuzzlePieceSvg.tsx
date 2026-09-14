import type { Piece } from '../lib/jigsawPathGenerator'

// Must comfortably exceed jigsawPathGenerator's max bump depth (0.22) so tabs never get clipped.
// Exported so callers can size/position the element's box to include this margin.
export const PIECE_BLEED = 0.3

interface PuzzlePieceSvgProps {
  piece: Piece
  grid: { rows: number; cols: number }
  imageDataUrl: string
  widthPx: number
  heightPx: number
  className?: string
  /** Adds a drop shadow that follows the piece's own silhouette, for a lifted/physical look. */
  elevated?: boolean
}

export function PuzzlePieceSvg({ piece, grid, imageDataUrl, widthPx, heightPx, className, elevated }: PuzzlePieceSvgProps) {
  const clipId = `piece-clip-${piece.row}-${piece.col}-${grid.rows}x${grid.cols}`
  const viewBoxSize = 1 + 2 * PIECE_BLEED

  return (
    <svg
      width={widthPx}
      height={heightPx}
      viewBox={`${-PIECE_BLEED} ${-PIECE_BLEED} ${viewBoxSize} ${viewBoxSize}`}
      preserveAspectRatio="none"
      className={className}
      style={{
        overflow: 'visible',
        display: 'block',
        filter: elevated
          ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.35)) drop-shadow(0 3px 5px rgba(0,0,0,0.3))'
          : undefined,
      }}
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <path d={piece.path} />
        </clipPath>
      </defs>
      <image
        href={imageDataUrl}
        x={-piece.col}
        y={-piece.row}
        width={grid.cols}
        height={grid.rows}
        preserveAspectRatio="none"
        clipPath={`url(#${clipId})`}
      />
      {/* Faint inner rim so the tab/blank silhouette itself reads clearly against neighboring pieces. */}
      <path d={piece.path} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={0.018} />
      <path d={piece.path} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.006} />
    </svg>
  )
}
