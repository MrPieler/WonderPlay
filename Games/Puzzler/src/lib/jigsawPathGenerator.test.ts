import { describe, expect, test } from 'vitest'
import { jigsawPathGenerator } from './jigsawPathGenerator'

describe('jigsawPathGenerator', () => {
  test('a 1x1 grid produces a single piece with all flat (border) edges', () => {
    const pieces = jigsawPathGenerator(1, 1, 'seed-1')

    expect(pieces).toHaveLength(1)
    const [piece] = pieces
    expect(piece.row).toBe(0)
    expect(piece.col).toBe(0)
    expect(piece.edges.every((e) => e.kind === 'flat')).toBe(true)
    expect(piece.path.length).toBeGreaterThan(0)
  })

  test('a shared internal edge produces complementary tab/blank geometry on both neighbors', () => {
    const [top, bottom] = jigsawPathGenerator(2, 1, 'seed-1')

    const topBottomEdge = top.edges.find((e) => e.side === 'bottom')!
    const bottomTopEdge = bottom.edges.find((e) => e.side === 'top')!

    expect(['tab', 'blank']).toContain(topBottomEdge.kind)
    expect(['tab', 'blank']).toContain(bottomTopEdge.kind)
    expect(topBottomEdge.kind).not.toBe(bottomTopEdge.kind)
    expect(topBottomEdge.geometry).toEqual(bottomTopEdge.geometry)

    // The grid's outer border stays flat.
    expect(top.edges.find((e) => e.side === 'top')!.kind).toBe('flat')
    expect(bottom.edges.find((e) => e.side === 'bottom')!.kind).toBe('flat')
    expect(top.edges.find((e) => e.side === 'left')!.kind).toBe('flat')
    expect(top.edges.find((e) => e.side === 'right')!.kind).toBe('flat')
  })

  test('a tab bulges outside the piece unit square and a blank stays inside it', () => {
    const [top, bottom] = jigsawPathGenerator(2, 1, 'seed-1')
    const tabPiece = top.edges.find((e) => e.side === 'bottom')!.kind === 'tab' ? top : bottom
    const blankPiece = tabPiece === top ? bottom : top

    const coords = (path: string) =>
      Array.from(path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)).map(([, x, y]) => [
        Number(x),
        Number(y),
      ])

    const tabCoords = coords(tabPiece.path)
    const blankCoords = coords(blankPiece.path)

    // The tab piece's silhouette pokes outside its own 0-1 unit square.
    expect(tabCoords.some(([, y]) => y < -0.01 || y > 1.01)).toBe(true)
    // The blank piece's silhouette never leaves its own 0-1 unit square.
    expect(blankCoords.every(([, y]) => y >= -0.01 && y <= 1.01)).toBe(true)
  })

  test('the same seed reproduces an identical cut every time', () => {
    const first = jigsawPathGenerator(3, 3, 'photo-abc')
    const second = jigsawPathGenerator(3, 3, 'photo-abc')

    expect(second).toEqual(first)
  })

  test('different seeds produce a different cut', () => {
    const first = jigsawPathGenerator(3, 3, 'photo-abc')
    const second = jigsawPathGenerator(3, 3, 'photo-xyz')

    expect(second).not.toEqual(first)
  })

  const grids: [rows: number, cols: number][] = [
    [1, 3],
    [3, 1],
    [2, 3],
    [3, 2],
    [3, 3],
    [3, 4],
    [4, 3],
    [4, 4],
  ]

  for (const [rows, cols] of grids) {
    test(`every internal edge is complementary and every piece has a valid path for a ${rows}x${cols} grid`, () => {
      const pieces = jigsawPathGenerator(rows, cols, `seed-${rows}x${cols}`)
      expect(pieces).toHaveLength(rows * cols)

      const byPosition = new Map(pieces.map((p) => [`${p.row},${p.col}`, p]))

      for (const piece of pieces) {
        expect(piece.path).toMatch(/^M [\d.,\s\-CL]+ Z$/)

        for (const edge of piece.edges) {
          const isBorder =
            (edge.side === 'top' && piece.row === 0) ||
            (edge.side === 'bottom' && piece.row === rows - 1) ||
            (edge.side === 'left' && piece.col === 0) ||
            (edge.side === 'right' && piece.col === cols - 1)

          if (isBorder) {
            expect(edge.kind).toBe('flat')
            expect(edge.geometry).toBeNull()
          } else {
            expect(edge.kind).not.toBe('flat')
            expect(edge.geometry).not.toBeNull()
          }
        }
      }

      // Every internal edge matches its neighbor with opposite kind and identical geometry.
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const piece = byPosition.get(`${r},${c}`)!

          if (c < cols - 1) {
            const right = piece.edges.find((e) => e.side === 'right')!
            const neighborLeft = byPosition.get(`${r},${c + 1}`)!.edges.find((e) => e.side === 'left')!
            expect(right.kind).not.toBe(neighborLeft.kind)
            expect(right.geometry).toEqual(neighborLeft.geometry)
          }

          if (r < rows - 1) {
            const bottom = piece.edges.find((e) => e.side === 'bottom')!
            const neighborTop = byPosition.get(`${r + 1},${c}`)!.edges.find((e) => e.side === 'top')!
            expect(bottom.kind).not.toBe(neighborTop.kind)
            expect(bottom.geometry).toEqual(neighborTop.geometry)
          }
        }
      }
    })
  }
})
