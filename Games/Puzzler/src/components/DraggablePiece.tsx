import { useDraggable } from '@dnd-kit/core'
import type { Piece } from '../lib/jigsawPathGenerator'
import { pieceId } from '../state/puzzleState'
import { PuzzlePieceSvg } from './PuzzlePieceSvg'

interface DraggablePieceProps {
  piece: Piece
  grid: { rows: number; cols: number }
  imageDataUrl: string
  boxWidthPx: number
  boxHeightPx: number
}

export function DraggablePiece({ piece, grid, imageDataUrl, boxWidthPx, boxHeightPx }: DraggablePieceProps) {
  const id = pieceId(piece.row, piece.col)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        touchAction: 'none',
        cursor: 'grab',
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <PuzzlePieceSvg piece={piece} grid={grid} imageDataUrl={imageDataUrl} widthPx={boxWidthPx} heightPx={boxHeightPx} elevated />
    </div>
  )
}
