export type Side = 'top' | 'right' | 'bottom' | 'left'
export type EdgeKind = 'flat' | 'tab' | 'blank'

/**
 * Named connector shapes a tab/blank bump can take. Kept varied on purpose so
 * a solved board doesn't read as a grid of near-identical bumps — every
 * internal edge picks one of these at random (shared by both neighbors, so
 * the tab and its matching blank always agree on shape).
 */
export type BumpStyle =
  | 'classic'
  | 'roundDome'
  | 'spike'
  | 'block'
  | 'mushroom'
  | 'trapezoid'
  | 'doubleBump'
  | 'hook'
  | 'wave'
  | 'diamond'
  | 'scallop'

const BUMP_STYLES: BumpStyle[] = [
  'classic',
  'roundDome',
  'spike',
  'block',
  'mushroom',
  'trapezoid',
  'doubleBump',
  'hook',
  'wave',
  'diamond',
  'scallop',
]

export interface EdgeGeometry {
  /** Position of the bump's center along the edge, as a fraction (0-1) of the edge length. */
  t: number
  /** Bump depth, as a fraction of the cell size. */
  depth: number
  /** Which connector shape this bump uses. */
  style: BumpStyle
  /** Style-specific extra randomness (e.g. which way a hook leans, double-bump spacing). */
  variant: number
}

export interface PieceEdge {
  side: Side
  kind: EdgeKind
  geometry: EdgeGeometry | null
}

export interface Piece {
  row: number
  col: number
  edges: PieceEdge[]
  /** SVG path (M/L/C commands), in coordinates relative to the piece's own 0-1 unit cell. */
  path: string
}

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BUMP_MIN_T = 0.35
const BUMP_MAX_T = 0.65
const BUMP_MIN_DEPTH = 0.15
const BUMP_MAX_DEPTH = 0.22
const BUMP_HALF_WIDTH = 0.15

interface InternalEdgeGeom extends EdgeGeometry {
  /** true: tab points toward the "second" cell (down for a horizontal edge, right for a vertical edge). */
  forward: boolean
}

function randomEdgeGeometry(rand: () => number): InternalEdgeGeom {
  return {
    t: BUMP_MIN_T + rand() * (BUMP_MAX_T - BUMP_MIN_T),
    depth: BUMP_MIN_DEPTH + rand() * (BUMP_MAX_DEPTH - BUMP_MIN_DEPTH),
    forward: rand() < 0.5,
    style: BUMP_STYLES[Math.floor(rand() * BUMP_STYLES.length)],
    variant: rand(),
  }
}

/**
 * Generates a deterministic set of jigsaw pieces for a rows x cols grid.
 * The same (rows, cols, seed) always produces an identical cut, so a
 * preview and its later solve never diverge.
 */
export function jigsawPathGenerator(rows: number, cols: number, seed: string): Piece[] {
  const rand = mulberry32(hashSeed(seed))

  // horizontal[r][c]: edge between cell (r,c) [first/top] and (r+1,c) [second/bottom].
  const horizontal: InternalEdgeGeom[][] = []
  for (let r = 0; r < rows - 1; r++) {
    const row: InternalEdgeGeom[] = []
    for (let c = 0; c < cols; c++) {
      row.push(randomEdgeGeometry(rand))
    }
    horizontal.push(row)
  }

  // vertical[r][c]: edge between cell (r,c) [first/left] and (r,c+1) [second/right].
  const vertical: InternalEdgeGeom[][] = []
  for (let r = 0; r < rows; r++) {
    const row: InternalEdgeGeom[] = []
    for (let c = 0; c < cols - 1; c++) {
      row.push(randomEdgeGeometry(rand))
    }
    vertical.push(row)
  }

  const pieces: Piece[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const edges: PieceEdge[] = [
        buildEdge('top', r > 0 ? horizontal[r - 1][c] : null, true),
        buildEdge('right', c < cols - 1 ? vertical[r][c] : null, false),
        buildEdge('bottom', r < rows - 1 ? horizontal[r][c] : null, false),
        buildEdge('left', c > 0 ? vertical[r][c - 1] : null, true),
      ]

      pieces.push({
        row: r,
        col: c,
        edges,
        path: buildPath(edges),
      })
    }
  }

  return pieces
}

/**
 * `isSecondCell` is true when this piece is the "second" cell of the shared
 * edge (below for a horizontal edge, right-of for a vertical edge). The
 * `forward` flag on the shared geometry always points toward the second
 * cell, so the two adjacent pieces get opposite (tab/blank) kinds from the
 * exact same geometry.
 */
function buildEdge(side: Side, shared: InternalEdgeGeom | null, isSecondCell: boolean): PieceEdge {
  if (!shared) {
    return { side, kind: 'flat', geometry: null }
  }

  const hasTab = shared.forward !== isSecondCell
  return {
    side,
    kind: hasTab ? 'tab' : 'blank',
    geometry: { t: shared.t, depth: shared.depth, style: shared.style, variant: shared.variant },
  }
}

const SIDE_ORDER: Side[] = ['top', 'right', 'bottom', 'left']

/**
 * Maps (u, v) in a side's own local frame to (x, y) in the piece's 0-1 unit
 * square: `u` runs 0→1 along the side in this piece's traversal direction
 * (matching the M→L→L→L→Z corner order below), `v` runs 0→1 outward, away
 * from the cell interior, regardless of which side it is.
 */
function pointOnSide(side: Side, u: number, v: number): [number, number] {
  switch (side) {
    case 'top':
      return [u, -v]
    case 'right':
      return [1 + v, u]
    case 'bottom':
      return [1 - u, 1 + v]
    case 'left':
      return [-v, 1 - u]
  }
}

/**
 * Converts the edge's globally-agreed bump position (`t`, measured
 * left-to-right for horizontal edges / top-to-bottom for vertical edges)
 * into this side's own local `u` (0→1 in this piece's traversal direction).
 * top/right traverse in the global direction already; bottom/left traverse
 * in reverse.
 */
function localT(side: Side, t: number): number {
  return side === 'top' || side === 'right' ? t : 1 - t
}

function fmt(n: number): string {
  return Number(n.toFixed(4)).toString()
}

type BumpSeg =
  | { type: 'L'; to: [number, number] }
  | { type: 'C'; c1: [number, number]; c2: [number, number]; to: [number, number] }

/**
 * Every profile below describes the bump as a sequence of segments from
 * (u - BUMP_HALF_WIDTH, 0) to (u + BUMP_HALF_WIDTH, 0) in the side's local
 * (u, v) frame, with `v` always >= 0 ("outward"). The caller flips the sign
 * for blanks, so keeping every profile's `v` non-negative guarantees a tab
 * always bulges outward and a blank always stays within the unit square,
 * whichever style gets picked.
 */
function classicProfile(u: number, depth: number): BumpSeg[] {
  return [{ type: 'C', c1: [u, depth], c2: [u, depth], to: [u + BUMP_HALF_WIDTH, 0] }]
}

function roundDomeProfile(u: number, depth: number): BumpSeg[] {
  const hw = BUMP_HALF_WIDTH
  return [
    { type: 'C', c1: [u - hw * 0.5, depth], c2: [u - hw * 0.15, depth * 1.08], to: [u, depth * 1.08] },
    { type: 'C', c1: [u + hw * 0.15, depth * 1.08], c2: [u + hw * 0.5, depth], to: [u + hw, 0] },
  ]
}

function spikeProfile(u: number, depth: number): BumpSeg[] {
  return [
    { type: 'L', to: [u, depth * 1.15] },
    { type: 'L', to: [u + BUMP_HALF_WIDTH, 0] },
  ]
}

function blockProfile(u: number, depth: number): BumpSeg[] {
  const hw = BUMP_HALF_WIDTH
  const w = hw * 0.55
  return [
    { type: 'L', to: [u - w, depth] },
    { type: 'L', to: [u + w, depth] },
    { type: 'L', to: [u + hw, 0] },
  ]
}

function mushroomProfile(u: number, depth: number): BumpSeg[] {
  const hw = BUMP_HALF_WIDTH
  const neck = hw * 0.4
  // Kept below hw so the bulb never overhangs past the shoulder attachment
  // points, which would cross the piece's own straight edge and self-intersect.
  const head = hw * 0.85
  const neckDepth = depth * 0.5
  const headDepth = depth
  return [
    { type: 'C', c1: [u - hw * 0.4, neckDepth * 0.6], c2: [u - neck, neckDepth * 0.9], to: [u - neck, neckDepth] },
    { type: 'C', c1: [u - head, neckDepth], c2: [u - head, headDepth], to: [u - head * 0.5, headDepth] },
    {
      type: 'C',
      c1: [u - head * 0.15, headDepth * 1.08],
      c2: [u + head * 0.15, headDepth * 1.08],
      to: [u + head * 0.5, headDepth],
    },
    { type: 'C', c1: [u + head, headDepth], c2: [u + head, neckDepth], to: [u + neck, neckDepth] },
    { type: 'C', c1: [u + neck, neckDepth * 0.9], c2: [u + hw * 0.4, neckDepth * 0.6], to: [u + hw, 0] },
  ]
}

function trapezoidProfile(u: number, depth: number): BumpSeg[] {
  const hw = BUMP_HALF_WIDTH
  const w = hw * 0.5
  return [
    { type: 'C', c1: [u - hw * 0.6, depth], c2: [u - w, depth], to: [u - w, depth] },
    { type: 'L', to: [u + w, depth] },
    { type: 'C', c1: [u + w, depth], c2: [u + hw * 0.6, depth], to: [u + hw, 0] },
  ]
}

function doubleBumpProfile(u: number, depth: number, variant: number): BumpSeg[] {
  const hw = BUMP_HALF_WIDTH
  const spread = hw * (0.45 + variant * 0.15)
  const d = depth * 0.85
  return [
    { type: 'C', c1: [u - spread, d], c2: [u - spread, d], to: [u - spread * 0.5, d * 0.3] },
    { type: 'C', c1: [u - spread * 0.1, 0], c2: [u + spread * 0.1, 0], to: [u + spread * 0.5, d * 0.3] },
    { type: 'C', c1: [u + spread, d], c2: [u + spread, d], to: [u + hw, 0] },
  ]
}

function hookProfile(u: number, depth: number, variant: number): BumpSeg[] {
  const hw = BUMP_HALF_WIDTH
  const lean = (variant - 0.5) * hw * 0.8
  const apex: [number, number] = [u + lean, depth * 1.05]
  return [
    { type: 'C', c1: [u - hw * 0.2, depth * 0.9], c2: [apex[0] - hw * 0.2, apex[1]], to: apex },
    { type: 'C', c1: [apex[0] + hw * 0.25, apex[1]], c2: [u + hw * 0.7, depth * 0.5], to: [u + hw, 0] },
  ]
}

function waveProfile(u: number, depth: number): BumpSeg[] {
  const hw = BUMP_HALF_WIDTH
  return [
    { type: 'C', c1: [u - hw * 0.6, 0], c2: [u - hw * 0.4, 0], to: [u - hw * 0.32, depth * 0.15] },
    { type: 'C', c1: [u - hw * 0.22, depth], c2: [u + hw * 0.22, depth], to: [u + hw * 0.32, depth * 0.15] },
    { type: 'C', c1: [u + hw * 0.4, 0], c2: [u + hw * 0.6, 0], to: [u + hw, 0] },
  ]
}

function diamondProfile(u: number, depth: number): BumpSeg[] {
  const hw = BUMP_HALF_WIDTH
  return [
    { type: 'L', to: [u - hw * 0.35, depth * 0.5] },
    { type: 'L', to: [u, depth] },
    { type: 'L', to: [u + hw * 0.35, depth * 0.5] },
    { type: 'L', to: [u + hw, 0] },
  ]
}

function scallopProfile(u: number, depth: number): BumpSeg[] {
  const hw = BUMP_HALF_WIDTH
  const d = depth * 0.55
  return [{ type: 'C', c1: [u - hw * 0.6, d], c2: [u + hw * 0.6, d], to: [u + hw, 0] }]
}

function canonicalBumpProfile(style: BumpStyle, u: number, depth: number, variant: number): BumpSeg[] {
  switch (style) {
    case 'classic':
      return classicProfile(u, depth)
    case 'roundDome':
      return roundDomeProfile(u, depth)
    case 'spike':
      return spikeProfile(u, depth)
    case 'block':
      return blockProfile(u, depth)
    case 'mushroom':
      return mushroomProfile(u, depth)
    case 'trapezoid':
      return trapezoidProfile(u, depth)
    case 'doubleBump':
      return doubleBumpProfile(u, depth, variant)
    case 'hook':
      return hookProfile(u, depth, variant)
    case 'wave':
      return waveProfile(u, depth)
    case 'diamond':
      return diamondProfile(u, depth)
    case 'scallop':
      return scallopProfile(u, depth)
  }
}

/**
 * Every profile above is written once, as if always read in the "forward"
 * direction (top/right sides, where local `u` increasing means the shared
 * `t` is increasing too). For bottom/left sides `localT` reverses that
 * mapping, so a piece on the "other side" of a shared edge walks the same
 * physical bump backwards in its own local frame. For a left-right
 * *symmetric* shape (nearly all of them) that doesn't matter — a symmetric
 * curve read backwards is the same curve. But for an asymmetric shape (only
 * `hook`, currently) it does: without correcting for it, the two neighbors
 * draw subtly different curves along what should be one shared seam, which
 * shows up as a faint "double line" where they don't quite coincide.
 *
 * The fix is to mirror every point around `u` (undoing the local/global
 * direction flip) and re-thread the segments in reverse order (with each
 * cubic's own control points swapped) so the result is still a valid
 * u-hw → u+hw path. This is a no-op in shape for symmetric profiles and
 * exactly compensates the flip for asymmetric ones, so every style stays
 * seamless regardless of which side of the edge is rendering it.
 */
function mirrorAndReverseProfile(u: number, segs: BumpSeg[]): BumpSeg[] {
  const mirror = ([x, y]: [number, number]): [number, number] => [2 * u - x, y]
  const froms: [number, number][] = [[u - BUMP_HALF_WIDTH, 0], ...segs.slice(0, -1).map((s) => s.to)]

  const reversed: BumpSeg[] = []
  for (let i = segs.length - 1; i >= 0; i--) {
    const seg = segs[i]
    const to = mirror(froms[i])
    if (seg.type === 'L') {
      reversed.push({ type: 'L', to })
    } else {
      reversed.push({ type: 'C', c1: mirror(seg.c2), c2: mirror(seg.c1), to })
    }
  }
  return reversed
}

function bumpProfile(style: BumpStyle, u: number, depth: number, variant: number, dir: 1 | -1): BumpSeg[] {
  const canonical = canonicalBumpProfile(style, u, depth, variant)
  return dir === 1 ? canonical : mirrorAndReverseProfile(u, canonical)
}

function segsToPath(side: Side, sign: number, segs: BumpSeg[]): string {
  return segs
    .map((seg) => {
      if (seg.type === 'L') {
        const p = pointOnSide(side, seg.to[0], sign * seg.to[1])
        return ` L ${fmt(p[0])},${fmt(p[1])}`
      }
      const c1 = pointOnSide(side, seg.c1[0], sign * seg.c1[1])
      const c2 = pointOnSide(side, seg.c2[0], sign * seg.c2[1])
      const to = pointOnSide(side, seg.to[0], sign * seg.to[1])
      return ` C ${fmt(c1[0])},${fmt(c1[1])} ${fmt(c2[0])},${fmt(c2[1])} ${fmt(to[0])},${fmt(to[1])}`
    })
    .join('')
}

function buildPath(edges: PieceEdge[]): string {
  const byside = new Map(edges.map((e) => [e.side, e]))
  const start = pointOnSide('top', 0, 0)
  let d = `M ${fmt(start[0])},${fmt(start[1])}`

  for (const side of SIDE_ORDER) {
    const edge = byside.get(side)!
    const end = pointOnSide(side, 1, 0)

    if (edge.kind === 'flat' || !edge.geometry) {
      d += ` L ${fmt(end[0])},${fmt(end[1])}`
      continue
    }

    const { t, depth, style, variant } = edge.geometry
    const u = localT(side, t)
    const sign = edge.kind === 'tab' ? 1 : -1
    const dir: 1 | -1 = side === 'top' || side === 'right' ? 1 : -1
    const shoulderIn = pointOnSide(side, u - BUMP_HALF_WIDTH, 0)

    d +=
      ` L ${fmt(shoulderIn[0])},${fmt(shoulderIn[1])}` +
      segsToPath(side, sign, bumpProfile(style, u, depth, variant, dir)) +
      ` L ${fmt(end[0])},${fmt(end[1])}`
  }

  return `${d} Z`
}
