import { describe, expect, it } from 'vitest'
import { PIECE_COUNTS } from './puzzleCut'
import { computePreviewSize, MAX_PREVIEW_SIZE, MIN_PREVIEW_SIZE } from './previewSize'

/** Mirrors the card chrome the screen renders around each preview: gap-3/gap-5 plus p-3. */
const CARD_GAP = 20
const CARD_PADDING = 12

function rowWidthFor(previewSize: number, perRow: number): number {
  return perRow * (previewSize + 2 * CARD_PADDING) + (perRow - 1) * CARD_GAP
}

describe('computePreviewSize', () => {
  it('draws previews at full size once the row is comfortably wide', () => {
    expect(computePreviewSize(1200)).toBe(MAX_PREVIEW_SIZE)
  })

  it('falls back to the full size before the row has been measured', () => {
    expect(computePreviewSize(0)).toBe(MAX_PREVIEW_SIZE)
  })

  it('never returns a preview too small to read', () => {
    for (const width of [1, 40, 120, 200]) {
      expect(computePreviewSize(width)).toBeGreaterThanOrEqual(MIN_PREVIEW_SIZE)
    }
  })

  it('never returns more than the full size', () => {
    for (let width = 0; width <= 2000; width += 37) {
      expect(computePreviewSize(width)).toBeLessThanOrEqual(MAX_PREVIEW_SIZE)
    }
  })

  it('fits at least two cards per row at every width the floor allows', () => {
    const smallestFittingWidth = rowWidthFor(MIN_PREVIEW_SIZE, 2)
    for (let width = smallestFittingWidth; width <= 2000; width += 13) {
      expect(rowWidthFor(computePreviewSize(width), 2)).toBeLessThanOrEqual(width)
    }
  })

  it('grows monotonically with the space available', () => {
    // Dropping from three cards per row to two is the one point where a wider row can
    // legitimately mean a smaller card, so each regime is checked on its own side of it.
    for (const [from, to] of [
      [1, 559],
      [560, 2000],
    ]) {
      let previous = computePreviewSize(from)
      for (let width = from; width <= to; width += 7) {
        const size = computePreviewSize(width)
        expect(size).toBeGreaterThanOrEqual(previous)
        previous = size
      }
    }
  })

  it('keeps every piece-count option reachable on a phone-sized row', () => {
    // A 390px-wide phone, less the sidebar rail and the screen's own padding.
    const phoneRow = 390 - 64 - 32
    const size = computePreviewSize(phoneRow)
    expect(rowWidthFor(size, 2)).toBeLessThanOrEqual(phoneRow)
    // All five options still fit on screen because they wrap into rows of two, not because
    // any of them is dropped.
    expect(PIECE_COUNTS.length).toBe(5)
  })
})
