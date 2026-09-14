export interface Grid {
  rows: number
  cols: number
}

const FACTOR_PAIRS: Record<number, [number, number]> = {
  3: [1, 3],
  6: [2, 3],
  9: [3, 3],
  12: [3, 4],
  16: [4, 4],
}

export function gridFactorizer(count: number, imageAspectRatio: number): Grid {
  const [a, b] = FACTOR_PAIRS[count]

  const wide: Grid = { rows: a, cols: b }
  const tall: Grid = { rows: b, cols: a }

  const wideRatioDelta = Math.abs(wide.cols / wide.rows - imageAspectRatio)
  const tallRatioDelta = Math.abs(tall.cols / tall.rows - imageAspectRatio)

  return wideRatioDelta <= tallRatioDelta ? wide : tall
}
