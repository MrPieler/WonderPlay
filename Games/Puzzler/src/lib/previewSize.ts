/** Longest edge a piece-count preview is ever drawn at, on a screen with room to spare. */
export const MAX_PREVIEW_SIZE = 220

/** Below this the preview stops reading as a picture at all, so it's the floor whatever the screen. */
export const MIN_PREVIEW_SIZE = 84

/** Gap between preview cards (Tailwind gap-3 / sm:gap-5) and each card's own padding (p-3). */
const CARD_GAP = 20
const CARD_PADDING = 12

/** Below this the row drops from three cards to two - two is the fewest it ever goes to. */
const THREE_UP_MIN_WIDTH = 560

/**
 * The size to draw each piece-count preview at, given how much width the row of cards actually
 * has. A fixed size only works while the screen is wide enough for it: on a phone, five 220px
 * cards either overflow their row or push the whole picker off the bottom of a viewport that
 * can't scroll. Sizing off the measured row instead keeps every option on screen and tappable
 * at any width, and keeps previews at their full size once there's room for it.
 */
export function computePreviewSize(availableWidth: number): number {
  if (availableWidth <= 0) return MAX_PREVIEW_SIZE

  const perRow = availableWidth >= THREE_UP_MIN_WIDTH ? 3 : 2
  const cardWidth = (availableWidth - (perRow - 1) * CARD_GAP) / perRow
  const previewWidth = Math.floor(cardWidth - 2 * CARD_PADDING)

  return Math.max(MIN_PREVIEW_SIZE, Math.min(MAX_PREVIEW_SIZE, previewWidth))
}
