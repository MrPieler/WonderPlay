import type { Piece } from '../lib/jigsawPathGenerator'
import { PIECE_BLEED } from './PuzzlePieceSvg'

interface PieceSocketSvgProps {
  piece: Piece
  widthPx: number
  heightPx: number
  active: boolean
}

/** Renders the empty, piece-shaped socket outline a piece will drop into (not a plain square). */
export function PieceSocketSvg({ piece, widthPx, heightPx, active }: PieceSocketSvgProps) {
  const viewBoxSize = 1 + 2 * PIECE_BLEED

  return (
    <svg
      width={widthPx}
      height={heightPx}
      viewBox={`${-PIECE_BLEED} ${-PIECE_BLEED} ${viewBoxSize} ${viewBoxSize}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible', display: 'block' }}
    >
      <path
        d={piece.path}
        fill={active ? 'var(--pz-socket-active-fill)' : 'var(--pz-socket-fill)'}
        stroke={active ? 'var(--pz-socket-active-stroke)' : 'var(--pz-socket-stroke)'}
        strokeWidth={active ? 0.022 : 0.014}
        style={{ transition: 'fill 0.1s, stroke 0.1s' }}
      />
    </svg>
  )
}
