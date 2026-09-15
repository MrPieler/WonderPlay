import type { ProcessedImage } from '../lib/imageProcessor'
import { PIECE_COUNTS, type PieceCount, type PuzzleCut } from '../lib/puzzleCut'
import { computeCellSize } from '../lib/cellSize'
import { computePreviewSize } from '../lib/previewSize'
import { useMeasuredSize } from '../../../../shell/hooks/useMeasuredSize'
import { PIECE_BLEED, PuzzlePieceSvg } from './PuzzlePieceSvg'

interface CountSelectScreenProps {
  image: ProcessedImage
  cuts: Record<PieceCount, PuzzleCut>
  onSelectCount: (count: PieceCount) => void
  onNewImage: () => void
}

export function CountSelectScreen({ image, cuts, onSelectCount, onNewImage }: CountSelectScreenProps) {
  // The previews are drawn at an explicit pixel size (their pieces are absolutely positioned),
  // so the row they sit in has to be measured rather than left to CSS to sort out.
  const [rowRef, rowBox] = useMeasuredSize({ width: 0, height: 0 })
  const previewSize = computePreviewSize(rowBox.width)

  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain">
      <div className="flex min-h-full flex-col items-center gap-4 p-4 sm:gap-6 sm:p-6">
        <h1 className="text-2xl font-bold text-pz-ink drop-shadow-sm sm:text-3xl">How many pieces?</h1>
        <p className="text-sm text-pz-ink-soft sm:text-base">Pick how tricky you want your puzzle to be.</p>

        <div ref={rowRef} className="flex w-full max-w-5xl flex-wrap justify-center gap-3 sm:gap-5">
          {PIECE_COUNTS.map((count) => {
            const cut = cuts[count]
            return (
              <button
                key={count}
                type="button"
                onClick={() => onSelectCount(count)}
                className="flex flex-col items-center gap-2 rounded-xl bg-pz-surface p-3 shadow ring-1 ring-pz-ring transition hover:scale-[1.02] hover:ring-2 hover:ring-pz-accent"
              >
                <PuzzlePreview image={image} cut={cut} previewSize={previewSize} />
                <span className="text-base font-semibold text-pz-ink sm:text-lg">{count} pieces</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onNewImage}
          className="mt-2 font-semibold text-pz-accent-strong underline hover:text-pz-ink sm:mt-4"
        >
          Choose a different photo
        </button>
      </div>
    </div>
  )
}

function PuzzlePreview({ image, cut, previewSize }: { image: ProcessedImage; cut: PuzzleCut; previewSize: number }) {
  const { grid, pieces } = cut
  const imageAspectRatio = image.width / image.height
  const boxWidth = imageAspectRatio >= 1 ? previewSize : previewSize * imageAspectRatio
  const { width: cellWidth, height: cellHeight } = computeCellSize(image.width, image.height, grid, boxWidth)

  const pieceBoxWidth = cellWidth * (1 + 2 * PIECE_BLEED)
  const pieceBoxHeight = cellHeight * (1 + 2 * PIECE_BLEED)
  const bleedX = cellWidth * PIECE_BLEED
  const bleedY = cellHeight * PIECE_BLEED

  return (
    <div
      className="relative overflow-hidden rounded-md bg-pz-surface-soft"
      style={{ width: grid.cols * cellWidth, height: grid.rows * cellHeight }}
    >
      {pieces.map((piece) => (
        <div
          key={`${piece.row}-${piece.col}`}
          className="absolute"
          style={{ left: piece.col * cellWidth - bleedX, top: piece.row * cellHeight - bleedY }}
        >
          <PuzzlePieceSvg
            piece={piece}
            grid={grid}
            imageDataUrl={image.dataUrl}
            widthPx={pieceBoxWidth}
            heightPx={pieceBoxHeight}
          />
        </div>
      ))}
    </div>
  )
}
