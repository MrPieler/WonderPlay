import { useDroppable } from '@dnd-kit/core'
import type { ProcessedImage } from '../lib/imageProcessor'
import type { Grid } from '../lib/gridFactorizer'
import type { Piece } from '../lib/jigsawPathGenerator'
import { pieceId } from '../state/puzzleState'
import { PIECE_BLEED, PuzzlePieceSvg } from './PuzzlePieceSvg'
import { PieceSocketSvg } from './PieceSocketSvg'

interface PuzzleBoardProps {
  image: ProcessedImage
  grid: Grid
  pieces: Piece[]
  placed: ReadonlySet<string>
  hint: boolean
  cellWidth: number
  cellHeight: number
}

export function PuzzleBoard({ image, grid, pieces, placed, hint, cellWidth, cellHeight }: PuzzleBoardProps) {
  const boardWidth = grid.cols * cellWidth
  const boardHeight = grid.rows * cellHeight
  const bleedX = cellWidth * PIECE_BLEED
  const bleedY = cellHeight * PIECE_BLEED
  const boxWidth = cellWidth * (1 + 2 * PIECE_BLEED)
  const boxHeight = cellHeight * (1 + 2 * PIECE_BLEED)

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-pz-board shadow-inner ring-1 ring-pz-ring"
      style={{ width: boardWidth, height: boardHeight }}
    >
      {hint && (
        <img
          src={image.dataUrl}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
        />
      )}

      {pieces
        .filter((piece) => !placed.has(pieceId(piece.row, piece.col)))
        .map((piece) => (
          <BoardSlot
            key={pieceId(piece.row, piece.col)}
            piece={piece}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            boxWidth={boxWidth}
            boxHeight={boxHeight}
            bleedX={bleedX}
            bleedY={bleedY}
          />
        ))}

      {pieces
        .filter((piece) => placed.has(pieceId(piece.row, piece.col)))
        .map((piece) => (
          <div
            key={pieceId(piece.row, piece.col)}
            className="pointer-events-none absolute"
            style={{ left: piece.col * cellWidth - bleedX, top: piece.row * cellHeight - bleedY }}
          >
            <PuzzlePieceSvg piece={piece} grid={grid} imageDataUrl={image.dataUrl} widthPx={boxWidth} heightPx={boxHeight} elevated />
          </div>
        ))}
    </div>
  )
}

function BoardSlot({
  piece,
  cellWidth,
  cellHeight,
  boxWidth,
  boxHeight,
  bleedX,
  bleedY,
}: {
  piece: Piece
  cellWidth: number
  cellHeight: number
  boxWidth: number
  boxHeight: number
  bleedX: number
  bleedY: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: pieceId(piece.row, piece.col) })

  return (
    <div
      ref={setNodeRef}
      className="absolute"
      style={{ left: piece.col * cellWidth, top: piece.row * cellHeight, width: cellWidth, height: cellHeight }}
    >
      <div className="pointer-events-none absolute" style={{ left: -bleedX, top: -bleedY }}>
        <PieceSocketSvg piece={piece} widthPx={boxWidth} heightPx={boxHeight} active={isOver} />
      </div>
    </div>
  )
}
