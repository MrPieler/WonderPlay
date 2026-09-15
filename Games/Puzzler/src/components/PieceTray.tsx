import type { RefObject } from 'react'
import type { ProcessedImage } from '../lib/imageProcessor'
import type { Grid } from '../lib/gridFactorizer'
import type { Piece } from '../lib/jigsawPathGenerator'
import { pieceId } from '../state/puzzleState'
import { DraggablePiece } from './DraggablePiece'

export interface TrayPieceLayout {
  x: number
  y: number
  rotateDeg: number
  zIndex: number
}

interface PieceTrayProps {
  image: ProcessedImage
  grid: Grid
  /** Pieces in a fixed (shuffled) order; only those not in `placed` are rendered. */
  pieces: Piece[]
  placed: ReadonlySet<string>
  /** Each unplaced piece's position/rotation/stacking within the tray - see SolvingScreen. */
  layout: Map<string, TrayPieceLayout>
  boxWidth: number
  boxHeight: number
  containerRef: RefObject<HTMLDivElement | null>
  /** True when the tray sits beside the board (a column) rather than below it (a strip). */
  beside: boolean
  /** Beside-the-board only: how wide the column should be, computed to fit its pieces (see SolvingScreen). */
  sideWidthPx?: number
}

export function PieceTray({
  image,
  grid,
  pieces,
  placed,
  layout,
  boxWidth,
  boxHeight,
  containerRef,
  beside,
  sideWidthPx,
}: PieceTrayProps) {
  const unplacedPieces = pieces.filter((piece) => !placed.has(pieceId(piece.row, piece.col)))

  return (
    <div
      ref={containerRef}
      className={`relative min-h-0 min-w-0 overflow-auto overscroll-contain rounded-lg bg-pz-tray/70 p-3 ring-1 ring-pz-ring/60 ${
        beside ? 'h-full flex-none' : 'flex-[2]'
      }`}
      style={beside && sideWidthPx != null ? { width: sideWidthPx } : undefined}
    >
      {unplacedPieces.length === 0 ? (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-pz-ink-soft">All pieces placed!</p>
      ) : (
        unplacedPieces.map((piece) => {
          const id = pieceId(piece.row, piece.col)
          const pos = layout.get(id)
          if (!pos) return null
          return (
            <div
              key={id}
              className="absolute"
              style={{
                left: pos.x,
                top: pos.y,
                zIndex: pos.zIndex,
                transform: `rotate(${pos.rotateDeg}deg)`,
              }}
            >
              <DraggablePiece
                piece={piece}
                grid={grid}
                imageDataUrl={image.dataUrl}
                boxWidthPx={boxWidth}
                boxHeightPx={boxHeight}
              />
            </div>
          )
        })
      )}
    </div>
  )
}
