import { useEffect, useMemo, useRef, useState } from 'react'
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import type { ProcessedImage } from '../lib/imageProcessor'
import type { Grid } from '../lib/gridFactorizer'
import type { Piece } from '../lib/jigsawPathGenerator'
import type { PuzzleCut } from '../lib/puzzleCut'
import { getPieceJitter } from '../lib/pieceJitter'
import { computeCellSize } from '../lib/cellSize'
import { shuffle } from '../lib/shuffle'
import {
  clampTrayPosition,
  computeDefaultTrayPositions,
  computeIdealTrayWidth,
  computeTrayOverlap,
  TRAY_OVERLAP,
  type TrayPosition,
} from '../lib/trayLayout'
import { useMeasuredSize } from '../../../../shell/hooks/useMeasuredSize'
import { useSidebarAction } from '../../../../shell'
import { PIECE_BLEED, PuzzlePieceSvg } from './PuzzlePieceSvg'
import { PuzzleBoard } from './PuzzleBoard'
import { PieceTray, type TrayPieceLayout } from './PieceTray'
import { pieceId } from '../state/puzzleState'

interface SolvingScreenProps {
  image: ProcessedImage
  cut: PuzzleCut
  placed: ReadonlySet<string>
  hint: boolean
  shuffleNonce: number
  onPlacePiece: (row: number, col: number) => void
  onToggleHint: () => void
  onReset: () => void
  onNewImage: () => void
}

export function SolvingScreen({
  image,
  cut,
  placed,
  hint,
  shuffleNonce,
  onPlacePiece,
  onToggleHint,
  onReset,
  onNewImage,
}: SolvingScreenProps) {
  const { grid, pieces } = cut
  const [rowWrapperRef, rowBox] = useMeasuredSize({ width: 900, height: 600 })
  const [boardWrapperRef, boardBox] = useMeasuredSize({ width: 320, height: 320 })
  const [trayWrapperRef, trayBox] = useMeasuredSize({ width: 260, height: 260 })
  const imageAspectRatio = image.width / image.height

  // Where the tray goes is decided by the *shape* of the play area, not by a width breakpoint.
  // The spare room a landscape screen has is beside the board and a portrait screen's is below
  // it, and that is precisely what turning a tablet swaps over - so measuring the area answers
  // the question directly, in one place, for every screen and both orientations. A width
  // breakpoint gets a portrait tablet wrong in particular: it's comfortably "wide" by any
  // phone-vs-desktop measure, yet squeezing the board into a column beside the tray there
  // leaves the puzzle small with a tall band of empty space under it.
  const isTrayBeside = rowBox.width >= rowBox.height

  // Total piece count, not how many remain unplaced - sizing off a fixed count keeps the
  // board and tray a stable size as pieces get placed, instead of growing to fill the space
  // each placement frees up (which read as the whole puzzle "resizing" while solving).
  const totalPieces = pieces.length
  const trayOverlap = isTrayBeside ? TRAY_OVERLAP.beside : TRAY_OVERLAP.below

  // Contain-fit the board inside whatever space is left (never crop to width alone), so
  // the whole board is always visible with no scrolling, on any screen size/orientation.
  // Strictly contain-fit: the board's height is boardWidth / imageAspectRatio, so honouring
  // both terms here is what guarantees it. There is deliberately no minimum piece size on top
  // of this - a floor that the available space can't actually satisfy doesn't make pieces
  // easier to grab, it just pushes the board past the edges of a container that clips, and a
  // clipped row of pieces is unreachable rather than merely small.
  const widthFromHeight = boardBox.height > 0 ? boardBox.height * imageAspectRatio : boardBox.width
  const boardWidth = Math.max(0, Math.min(boardBox.width, widthFromHeight))
  const natural = computeCellSize(image.width, image.height, grid, boardWidth)

  // When the tray sits beside the board, give it however much width it actually needs to show
  // every piece at full size (up to a capped share of the row, kept fairly narrow so the tray
  // reads as a compact overlapping pile rather than a wide spread-out sidebar) instead of a
  // one-size-fits-all sidebar - a fixed narrow sidebar either wastes space for a few pieces
  // or (worse, for grid shapes like the 1x3/3x1 a 3-piece puzzle always uses, whose cells are
  // far from square) forces pieces, and by extension the whole board, to shrink far more than
  // necessary just because a handful of them don't fit shoulder-to-shoulder in a narrow column.
  // Tray fit math must work in rendered piece *box* size (cell size plus the PIECE_BLEED
  // margin baked into every piece's SVG viewBox), not raw cell size - a piece's actual
  // on-screen footprint in the tray is 1.6x its cell size, and sizing off the smaller
  // number let pieces overflow past the tray's own edges.
  const naturalBoxWidth = natural.width * (1 + 2 * PIECE_BLEED)
  const naturalBoxHeight = natural.height * (1 + 2 * PIECE_BLEED)

  let sideTrayWidthPx: number | undefined
  if (isTrayBeside) {
    // Measured off the stable outer row container, not off the board/tray split itself -
    // sizing the tray from its own rendered width would feed back into this same
    // calculation next render and let it creep wider than intended.
    // The 200px floor keeps a tray usable on a normal screen, but it has to stay a *share* of
    // the row as well: on a play area only a few hundred pixels across, a flat 200px column is
    // half the puzzle's space, and the board is the part that should win that argument.
    const maxTrayWidth = Math.min(rowBox.width * 0.45, Math.max(200, rowBox.width * 0.42))
    const minTrayWidth = Math.min(260, rowBox.width * 0.22) || 260
    const idealTrayWidth = computeIdealTrayWidth(
      rowBox.height,
      naturalBoxWidth,
      naturalBoxHeight,
      totalPieces,
      maxTrayWidth,
      trayOverlap,
    )
    sideTrayWidthPx = Math.min(maxTrayWidth, Math.max(minTrayWidth, idealTrayWidth))
  }

  // The board always renders at its full contain-fit size - the puzzle itself should take up
  // the majority of the screen. Tray pieces use this exact same size (never shrunk) so a piece
  // always matches its board slot, no matter how the window is resized - when the tray can't
  // fit every piece at this size, it packs them tighter (more overlap) instead, and falls back
  // to its own internal scroll only if even maximum overlap isn't enough (see PieceTray).
  const cellWidth = natural.width
  const cellHeight = natural.height
  const boxWidth = cellWidth * (1 + 2 * PIECE_BLEED)
  const boxHeight = cellHeight * (1 + 2 * PIECE_BLEED)

  const dynamicTrayOverlap = computeTrayOverlap(trayBox.width, trayBox.height, boxWidth, boxHeight, totalPieces, trayOverlap)

  const [activePieceId, setActivePieceId] = useState<string | null>(null)

  // Where the user has physically dragged a tray piece to - overrides the default pile
  // layout below, and persists (like a real piece staying wherever you left it) until the
  // puzzle reshuffles.
  const [manualPositions, setManualPositions] = useState<Record<string, TrayPosition>>({})
  const [frontOrder, setFrontOrder] = useState<Record<string, number>>({})
  const zCounterRef = useRef(totalPieces)

  useEffect(() => {
    setManualPositions({})
    setFrontOrder({})
    zCounterRef.current = totalPieces
  }, [shuffleNonce, totalPieces])

  const shuffledPieces = useMemo(() => shuffle(pieces), [pieces, shuffleNonce])
  const shuffledIds = useMemo(() => shuffledPieces.map((p) => pieceId(p.row, p.col)), [shuffledPieces])

  const defaultPositions = useMemo(
    () => computeDefaultTrayPositions(shuffledIds, boxWidth, boxHeight, trayBox.width, dynamicTrayOverlap),
    [shuffledIds, boxWidth, boxHeight, trayBox.width, dynamicTrayOverlap],
  )

  const pieceLayout = useMemo(() => {
    const layout = new Map<string, TrayPieceLayout>()
    shuffledIds.forEach((id, index) => {
      if (placed.has(id)) return
      const jitter = getPieceJitter(id, shuffleNonce)
      const manual = manualPositions[id]
      const def = defaultPositions.get(id) ?? { x: 0, y: 0 }
      const base = manual ?? { x: def.x + jitter.dx * boxWidth, y: def.y + jitter.dy * boxHeight }
      layout.set(id, {
        x: base.x,
        y: base.y,
        rotateDeg: jitter.rotateDeg,
        zIndex: frontOrder[id] ?? index,
      })
    })
    return layout
  }, [shuffledIds, placed, manualPositions, defaultPositions, shuffleNonce, frontOrder, boxWidth, boxHeight])

  function handleDragStart(event: DragStartEvent) {
    setActivePieceId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePieceId(null)
    const { active, over } = event
    const id = String(active.id)

    if (over && over.id === active.id) {
      const [row, col] = id.split('-').map(Number)
      onPlacePiece(row, col)
      return
    }

    if (placed.has(id)) return
    const current = pieceLayout.get(id)
    if (!current) return

    const next = clampTrayPosition(
      current.x + event.delta.x,
      current.y + event.delta.y,
      boxWidth,
      boxHeight,
      trayBox.width,
      trayBox.height,
    )
    setManualPositions((prev) => ({ ...prev, [id]: next }))
    setFrontOrder((prev) => ({ ...prev, [id]: ++zCounterRef.current }))
  }

  const activePiece = activePieceId ? pieces.find((p) => `${p.row}-${p.col}` === activePieceId) : null
  const activeJitter = activePieceId ? getPieceJitter(activePieceId, shuffleNonce) : null

  useSidebarAction({ id: 'puzzler-hint', label: 'Hint', pressed: hint, onClick: onToggleHint })
  useSidebarAction({ id: 'puzzler-reset', label: 'Reset', onClick: onReset })
  useSidebarAction({ id: 'puzzler-new', label: 'New', onClick: onNewImage })

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full w-full overflow-hidden">
        <div
          ref={rowWrapperRef}
          className={`flex min-h-0 min-w-0 flex-1 gap-2 p-2 ${isTrayBeside ? 'flex-row' : 'flex-col'}`}
        >
          <div
            ref={boardWrapperRef}
            className={`flex min-h-0 min-w-0 items-center justify-center ${isTrayBeside ? 'flex-1' : 'flex-[3]'}`}
          >
            <PuzzleBoard
              image={image}
              grid={grid}
              pieces={pieces}
              placed={placed}
              hint={hint}
              cellWidth={cellWidth}
              cellHeight={cellHeight}
            />
          </div>

          <PieceTray
            image={image}
            grid={grid}
            pieces={shuffledPieces}
            placed={placed}
            layout={pieceLayout}
            boxWidth={boxWidth}
            boxHeight={boxHeight}
            containerRef={trayWrapperRef}
            beside={isTrayBeside}
            sideWidthPx={sideTrayWidthPx}
          />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePiece && activeJitter && (
          <LiftedPiece
            piece={activePiece}
            grid={grid}
            imageDataUrl={image.dataUrl}
            boxWidthPx={boxWidth}
            boxHeightPx={boxHeight}
            fromRotateDeg={activeJitter.rotateDeg}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

function LiftedPiece({
  piece,
  grid,
  imageDataUrl,
  boxWidthPx,
  boxHeightPx,
  fromRotateDeg,
}: {
  piece: Piece
  grid: Grid
  imageDataUrl: string
  boxWidthPx: number
  boxHeightPx: number
  fromRotateDeg: number
}) {
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setSettled(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      style={{
        cursor: 'grabbing',
        transform: `rotate(${settled ? 0 : fromRotateDeg}deg)`,
        transition: 'transform 150ms ease-out',
      }}
    >
      <PuzzlePieceSvg piece={piece} grid={grid} imageDataUrl={imageDataUrl} widthPx={boxWidthPx} heightPx={boxHeightPx} elevated />
    </div>
  )
}
