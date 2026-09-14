export interface TrayScale {
  /** Multiply a piece's natural cellWidth/cellHeight by this to get its tray size. */
  scale: number
}

const MIN_SCALE = 0.18
const MAX_SCALE = 1

/** How much adjacent tray pieces overlap, as a fraction of piece box size (0 = edge-to-edge, higher = a denser pile). */
export const TRAY_OVERLAP = {
  mobile: 0.14,
  desktop: 0.42,
} as const

function pitchOf(size: number, overlap: number): number {
  return size * (1 - overlap)
}

/** How many columns of `boxWidth`-sized (with `pitchW` center-to-center spacing) pieces fit in `trayWidth`. */
function columnsFor(trayWidth: number, boxWidth: number, pitchW: number, count: number): number {
  if (boxWidth <= 0 || pitchW <= 0) return 1
  if (trayWidth < boxWidth) return 1
  return Math.max(1, Math.min(count, 1 + Math.floor((trayWidth - boxWidth) / pitchW)))
}

/**
 * Picks the largest uniform piece scale that lets all `count` pieces flow
 * (wrapping left-to-right, top-to-bottom, overlapping by `overlap`) inside a
 * `trayWidth` x `trayHeight` box with no scrolling. Binary search over scale
 * rather than a closed-form solution, since the column count is a step
 * function of scale.
 *
 * `count` should be the puzzle's total piece count, not how many remain
 * unplaced - using a fixed count keeps the tray (and, since board and tray
 * share one scale, the board too) a stable size as pieces get placed, rather
 * than growing to fill the space each placement frees up.
 */
export function computeTrayScale(
  trayWidth: number,
  trayHeight: number,
  cellWidth: number,
  cellHeight: number,
  count: number,
  overlap: number,
): TrayScale {
  if (count <= 0 || trayWidth <= 0 || trayHeight <= 0 || cellWidth <= 0 || cellHeight <= 0) {
    return { scale: MAX_SCALE }
  }

  const fits = (scale: number) => {
    const boxW = cellWidth * scale
    const boxH = cellHeight * scale
    const pitchW = pitchOf(boxW, overlap)
    const pitchH = pitchOf(boxH, overlap)
    const cols = columnsFor(trayWidth, boxW, pitchW, count)
    const rows = Math.ceil(count / cols)
    const neededWidth = boxW + (cols - 1) * pitchW
    const neededHeight = boxH + (rows - 1) * pitchH
    return neededWidth <= trayWidth && neededHeight <= trayHeight
  }

  let lo = MIN_SCALE
  let hi = MAX_SCALE
  let best = fits(lo) ? lo : MIN_SCALE

  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (fits(mid)) {
      best = mid
      lo = mid
    } else {
      hi = mid
    }
  }

  return { scale: best }
}

/**
 * How wide a tray column needs to be to show all `count` pieces at their
 * full natural (cellWidth x cellHeight) size, overlapping by `overlap` and
 * wrapping into as few columns as will fit within `availableHeight` with no
 * scrolling, capped at `maxWidth`. `count` should be the puzzle's total
 * piece count (see `computeTrayScale`) so the column stays a stable width
 * as pieces get placed.
 */
export function computeIdealTrayWidth(
  availableHeight: number,
  cellWidth: number,
  cellHeight: number,
  count: number,
  maxWidth: number,
  overlap: number,
): number {
  if (count <= 0 || cellWidth <= 0 || cellHeight <= 0) {
    return 0
  }
  if (availableHeight <= 0) {
    return Math.min(cellWidth, maxWidth)
  }

  const pitchH = pitchOf(cellHeight, overlap)
  const pitchW = pitchOf(cellWidth, overlap)
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns)
    const neededHeight = cellHeight + (rows - 1) * pitchH
    if (neededHeight <= availableHeight) {
      const neededWidth = cellWidth + (columns - 1) * pitchW
      return Math.min(neededWidth, maxWidth)
    }
  }

  // Even one piece per row doesn't fit the available height; asking for the max share
  // at least gives computeTrayScale the most room possible to shrink pieces into.
  return maxWidth
}

const MAX_OVERLAP = 0.82

/**
 * Pieces must always render at the same fixed `boxWidth`/`boxHeight` as their board slot -
 * never shrunk to make room. So instead of scaling pieces down when they don't fit the tray,
 * this finds the smallest overlap (packing pieces tighter, not smaller) at or above
 * `baseOverlap` that lets all `count` pieces flow into `trayWidth` x `trayHeight` with no
 * scrolling. `fits` is monotonic in overlap (more overlap -> smaller pitch -> always at least
 * as easy to fit), so a binary search finds the minimal sufficient overlap directly. If even
 * `MAX_OVERLAP` isn't enough (e.g. a single piece box is wider than the whole tray, which
 * happens for grid shapes like a 3-piece puzzle's 1x3/3x1 strip), returns `MAX_OVERLAP` and
 * lets the tray's own scroll container (see PieceTray) be the last-resort fallback rather
 * than ever shrinking the pieces.
 */
export function computeTrayOverlap(
  trayWidth: number,
  trayHeight: number,
  boxWidth: number,
  boxHeight: number,
  count: number,
  baseOverlap: number,
): number {
  if (count <= 0 || trayWidth <= 0 || trayHeight <= 0 || boxWidth <= 0 || boxHeight <= 0) {
    return baseOverlap
  }

  const fits = (overlap: number) => {
    const pitchW = pitchOf(boxWidth, overlap)
    const pitchH = pitchOf(boxHeight, overlap)
    const cols = columnsFor(trayWidth, boxWidth, pitchW, count)
    const rows = Math.ceil(count / cols)
    const neededWidth = boxWidth + (cols - 1) * pitchW
    const neededHeight = boxHeight + (rows - 1) * pitchH
    return neededWidth <= trayWidth && neededHeight <= trayHeight
  }

  if (fits(baseOverlap)) return baseOverlap
  if (!fits(MAX_OVERLAP)) return MAX_OVERLAP

  let lo = baseOverlap
  let hi = MAX_OVERLAP
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (fits(mid)) {
      hi = mid
    } else {
      lo = mid
    }
  }

  return hi
}

export interface TrayPosition {
  x: number
  y: number
}

/**
 * Stable grid-flow default layout for a fixed piece order (e.g. the tray's
 * shuffled order) - deliberately NOT recomputed from just the still-unplaced
 * pieces, so placing a piece from the middle of the pile leaves that spot
 * empty instead of reflowing the rest, like lifting a piece out of a real
 * pile of pieces on a table.
 */
export function computeDefaultTrayPositions(
  pieceIds: readonly string[],
  boxWidth: number,
  boxHeight: number,
  trayWidth: number,
  overlap: number,
): Map<string, TrayPosition> {
  const positions = new Map<string, TrayPosition>()
  if (boxWidth <= 0 || boxHeight <= 0) return positions

  const pitchW = pitchOf(boxWidth, overlap)
  const pitchH = pitchOf(boxHeight, overlap)
  const columns = columnsFor(trayWidth, boxWidth, pitchW, pieceIds.length)

  pieceIds.forEach((id, i) => {
    const col = i % columns
    const row = Math.floor(i / columns)
    positions.set(id, { x: col * pitchW, y: row * pitchH })
  })

  return positions
}

/** Keeps a manually-dragged tray piece fully inside the tray's own box. */
export function clampTrayPosition(
  x: number,
  y: number,
  boxWidth: number,
  boxHeight: number,
  trayWidth: number,
  trayHeight: number,
): TrayPosition {
  const maxX = Math.max(0, trayWidth - boxWidth)
  const maxY = Math.max(0, trayHeight - boxHeight)
  return {
    x: Math.min(Math.max(x, 0), maxX),
    y: Math.min(Math.max(y, 0), maxY),
  }
}
