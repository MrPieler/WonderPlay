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
  /** Desktop-only: how wide the tray column should be, computed to fit its pieces (see SolvingScreen). */
  desktopWidthPx?: number
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
  desktopWidthPx,
}: PieceTrayProps) {
  const unplacedPieces = pieces.filter((piece) => !placed.has(pieceId(piece.row, piece.col)))

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-[2] overflow-auto rounded-lg bg-pz-tray/70 p-3 ring-1 ring-pz-ring/60 md:h-full md:w-72 md:flex-none"
      style={desktopWidthPx != null ? { width: desktopWidthPx } : undefined}
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
