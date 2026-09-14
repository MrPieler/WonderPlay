import { MAP_CONFIG, type MapConfig } from './mapConfig'

export interface WireSample {
  x: number
  y: number
  /** Tangent direction of the wire at this point, in radians. */
  angle: number
  /** Cumulative arc length from the start, as a 0-1 fraction of the total path length. */
  t: number
}

export interface WirePath {
  samples: WireSample[]
  totalLength: number
  start: WireSample
  end: WireSample
}

export interface NearestSampleResult {
  distance: number
  sample: WireSample
  index: number
}

export interface GenerateWirePathOptions {
  width: number
  height: number
  config?: MapConfig
  rand?: () => number
}

const SAMPLE_STEP_PX = 3

/**
 * Finds the closest point on the wire to (x, y) by scanning every sample. Path lengths in this
 * game top out at a few hundred samples, so a linear scan stays well under a millisecond — fast
 * enough to call on every animation frame without a spatial index.
 */
export function findNearestSample(path: WirePath, x: number, y: number): NearestSampleResult {
  let bestIndex = 0
  let bestDist = Infinity
  for (let i = 0; i < path.samples.length; i++) {
    const s = path.samples[i]
    const d = Math.hypot(s.x - x, s.y - y)
    if (d < bestDist) {
      bestDist = d
      bestIndex = i
    }
  }
  return { distance: bestDist, sample: path.samples[bestIndex], index: bestIndex }
}

/**
 * Rescales a generated path to a new canvas size (e.g. after a resize/orientation change)
 * without regenerating it, so an in-progress attempt never loses its map. Angles are
 * recomputed from the rescaled neighbors rather than transformed analytically, which stays
 * correct even under a non-uniform (different x/y) scale.
 */
export function rescaleWirePath(path: WirePath, scaleX: number, scaleY: number): WirePath {
  const scaled = path.samples.map((s) => ({ x: s.x * scaleX, y: s.y * scaleY, t: s.t }))
  const samples: WireSample[] = scaled.map((p, i) => {
    const a = scaled[Math.max(0, i - 1)]
    const b = scaled[Math.min(scaled.length - 1, i + 1)]
    return { x: p.x, y: p.y, angle: Math.atan2(b.y - a.y, b.x - a.x), t: p.t }
  })
  return {
    samples,
    totalLength: path.totalLength * ((scaleX + scaleY) / 2),
    start: samples[0],
    end: samples[samples.length - 1],
  }
}

/**
 * Generates a randomized, always-completable wire path sized to fit (width, height). Start and
 * end are fixed — the left-middle and right-middle of the play area — so only the route between
 * them is random. "Always completable" falls directly out of how collisions are checked
 * elsewhere (distance from the ring to this exact curve) — tracing the returned samples keeps
 * that distance at ~0 the whole way, so no extra solvability check is needed here.
 */
export function generateWirePath({ width, height, config = MAP_CONFIG, rand = createRandom() }: GenerateWirePathOptions): WirePath {
  const grid = computeGrid(width, height, config.cellSize)

  // On a small canvas the grid may be too tight to fit the full target length once the
  // self-avoidance clearance is honored — scale the target down to what the grid can actually
  // hold instead of repeatedly failing and falling back to a boring straight line.
  const availableCells = grid.cols * grid.rows
  let maxSteps = Math.max(8, Math.min(config.maxSteps, Math.floor(availableCells * 0.4)))
  let minSteps = Math.max(6, Math.min(config.minSteps, maxSteps - 2))

  // A self-avoiding route of one *exact* target length between two fixed, far-apart points is a
  // genuinely hard search to complete — hard enough that a bounded backtracking attempt can run
  // out of budget without ever proving one doesn't exist, even though a shorter target on the
  // very same grid succeeds easily. Rather than gamble the whole map on one ambitious length,
  // retry with a progressively shorter (but still well past a direct line) target until one
  // lands, before ever falling back to a boring straight wire.
  let cells: Cell[] | null = null
  for (let rung = 0; rung < 6 && !cells; rung++) {
    cells = findWirePath(grid, { ...config, minSteps, maxSteps }, rand)
    minSteps = Math.max(6, Math.floor(minSteps * 0.8))
    maxSteps = Math.max(minSteps + 2, Math.floor(maxSteps * 0.85))
  }
  cells ??= fallbackCells(grid)

  const points = cells.map((c) => cellCenter(c, grid))
  const cornerRadius = config.cornerRadiusFactor * grid.cellSize
  return buildSmoothPath(points, cornerRadius)
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

/** Exposed for tests (deterministic seeds); gameplay code omits the seed for real randomness. */
export function createRandom(seed?: number): () => number {
  return mulberry32(seed ?? (Math.random() * 0xffffffff) >>> 0)
}

interface Point {
  x: number
  y: number
}

interface Cell {
  col: number
  row: number
}

interface GridInfo {
  cellSize: number
  cols: number
  rows: number
  originX: number
  originY: number
}

type Dir = readonly [number, number]
const DIRS: Dir[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function key(c: Cell): string {
  return `${c.col},${c.row}`
}

function inBounds(c: Cell, cols: number, rows: number): boolean {
  return c.col >= 0 && c.col < cols && c.row >= 0 && c.row < rows
}

/** Adapts the walking grid to the available space, always leaving room for at least a 6x5 walk. */
function computeGrid(width: number, height: number, baseCellSize: number): GridInfo {
  const minMargin = 20
  const minCols = 6
  const minRows = 5

  let cellSize = Math.min(baseCellSize, (width - 2 * minMargin) / minCols, (height - 2 * minMargin) / minRows)
  cellSize = Math.max(cellSize, 24)

  const cols = Math.max(minCols, Math.floor((width - 2 * minMargin) / cellSize))
  const rows = Math.max(minRows, Math.floor((height - 2 * minMargin) / cellSize))
  const originX = (width - cols * cellSize) / 2
  const originY = (height - rows * cellSize) / 2

  return { cellSize, cols, rows, originX, originY }
}

function cellCenter(cell: Cell, grid: GridInfo): Point {
  return {
    x: grid.originX + (cell.col + 0.5) * grid.cellSize,
    y: grid.originY + (cell.row + 0.5) * grid.cellSize,
  }
}

const ORTHOGONAL: Dir[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

/**
 * A candidate cell is only valid if none of its 4 orthogonal neighbors are already part of the
 * path, other than the current cell and the one before it. Excluding just those two (rather than
 * only the current cell) is what lets the walk turn normally — a turn's own previous cell is
 * always diagonally adjacent to where it turns next, which is expected geometry, not a crowding
 * problem. Anything visited *earlier* than that still blocks the move, which is what keeps
 * non-adjacent strands of the wire from ever directly touching.
 *
 * Deliberately checks only the 4 orthogonal neighbors, not all 8 — a diagonal touch (two cell
 * centers a full `sqrt(2) * cellSize` apart) is still comfortably wider than any ring's
 * tolerance, so forbidding it too would buy no real safety margin while roughly halving how much
 * of the grid a long, fixed-endpoint walk can actually reach. That headroom is what makes a
 * 30+ step walk to a specific far cell find a route at all instead of backtracking into a corner.
 */
function hasClearance(candidate: Cell, path: Cell[], visited: Set<string>): boolean {
  const current = path[path.length - 1]
  const prior = path.length >= 2 ? path[path.length - 2] : null

  for (const [dc, dr] of ORTHOGONAL) {
    const n: Cell = { col: candidate.col + dc, row: candidate.row + dr }
    if (n.col === current.col && n.row === current.row) continue
    if (prior && n.col === prior.col && n.row === prior.row) continue
    if (visited.has(key(n))) return false
  }
  return true
}

function weightedPick<T extends { weight: number }>(items: T[], rand: () => number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let r = rand() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item
  }
  return items[items.length - 1]
}

/** Start is always the grid's left-middle cell, end always its right-middle — fixed regardless of the random route between them. */
function anchorCells(grid: GridInfo): { start: Cell; end: Cell } {
  const row = Math.floor(grid.rows / 2)
  return { start: { col: 0, row }, end: { col: grid.cols - 1, row } }
}

function isSameCell(a: Cell, b: Cell): boolean {
  return a.col === b.col && a.row === b.row
}

/** True if `a` is one of `b`'s 8 surrounding cells (or `b` itself). */
function isNear(a: Cell, b: Cell): boolean {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row)) <= 1
}

function directionBetween(a: Cell, b: Cell): Dir {
  return [b.col - a.col, b.row - a.row]
}

function centroidOf(cells: Cell[]): { col: number; row: number } {
  let sumCol = 0
  let sumRow = 0
  for (const c of cells) {
    sumCol += c.col
    sumRow += c.row
  }
  return { col: sumCol / cells.length, row: sumRow / cells.length }
}

const HAIRPIN_ATTEMPT_CHANCE = 0.18

/**
 * Tries to splice a hairpin into the walk right after `current`: two steps perpendicular to the
 * current heading, then one step back in the exact opposite of that heading. The net effect
 * reverses direction entirely, which is what reads as a 180° swerve once corners are rounded. A
 * *one*-cell-wide hairpin is geometrically impossible under the clearance rule — the cell the
 * walk arrived from ends up diagonally touching the hairpin's landing cell — so the perpendicular
 * leg needs the full two cells to clear its own approach. Every cell still has to satisfy the
 * normal clearance rule, and none may cut into the reserved buffer around the fixed end (see
 * `findWirePath`) before the walk is long enough to legitimately finish.
 */
function attemptHairpin(
  current: Cell,
  lastDir: Dir,
  path: Cell[],
  visited: Set<string>,
  grid: GridInfo,
  end: Cell,
  minSteps: number,
  rand: () => number,
): Cell[] | null {
  const perpendicular: Dir[] = lastDir[0] !== 0 ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]]
  const order = rand() < 0.5 ? perpendicular : [perpendicular[1], perpendicular[0]]

  const legal = (cell: Cell, tentativePath: Cell[]): boolean => {
    if (!inBounds(cell, grid.cols, grid.rows) || visited.has(key(cell))) return false
    if (!isSameCell(cell, end) && isNear(cell, end) && path.length < minSteps) return false
    return hasClearance(cell, tentativePath, visited)
  }

  for (const p of order) {
    const a1: Cell = { col: current.col + p[0], row: current.row + p[1] }
    const a2: Cell = { col: a1.col + p[0], row: a1.row + p[1] }
    const reverseDir: Dir = [-lastDir[0], -lastDir[1]]
    const b: Cell = { col: a2.col + reverseDir[0], row: a2.row + reverseDir[1] }

    if (!legal(a1, path)) continue
    if (!legal(a2, [...path, a1])) continue
    if (!legal(b, [...path, a1, a2])) continue

    return [a1, a2, b]
  }
  return null
}

/**
 * A randomized, backtracking walk from the fixed start cell to the fixed end cell. Backtracking
 * (popping a dead end and trying another branch) makes this a complete search — if any valid
 * route exists it will be found — so a fixed, far-apart start/end pair never leaves the map
 * unsolvable. Three things push it toward the "long, swervy, fills the canvas" shape the game
 * wants: turning is weighted over continuing straight, each step prefers cells far from the
 * walk's own centroid (so it spreads rather than hugging one path), and a handful of forced
 * hairpins guarantee a few genuine 180° reversals rather than leaving them to chance. A small
 * buffer reserved around the fixed end (see `isNear`) stops the walk from accidentally wandering
 * into — and using up — the cells it will eventually need to approach it from.
 */
function findWirePath(grid: GridInfo, config: MapConfig, rand: () => number): Cell[] | null {
  const { start, end } = anchorCells(grid)
  const { minSteps, maxSteps } = config

  const path: Cell[] = [start]
  const visited = new Set<string>([key(start)])
  let lastDir: Dir | null = null
  let hairpinsRemaining = 2 + Math.floor(rand() * 3)

  // triedFromHere[d] holds every cell already attempted (and abandoned) as a next step from
  // path[d], so that once a child leads nowhere it isn't picked again from that same parent —
  // without this, un-marking `visited` on backtrack (below) would just bounce back and forth
  // between the same two cells forever. A cell popped off here stays free for a *different*
  // parent to try, which is what makes the search actually exhaustive rather than falsely
  // concluding no route exists.
  const triedFromHere: Set<string>[] = [new Set()]

  // Bounded per attempt (generateWirePath retries with an easier target if this returns null),
  // so one unlucky, very-constrained target can't stall level generation.
  for (let guard = 0; guard < 40000; guard++) {
    const current = path[path.length - 1]
    if (isSameCell(current, end)) return path

    if (hairpinsRemaining > 0 && lastDir && path.length < minSteps - 6 && rand() < HAIRPIN_ATTEMPT_CHANCE) {
      const hp = attemptHairpin(current, lastDir, path, visited, grid, end, minSteps, rand)
      if (hp) {
        for (const c of hp) {
          path.push(c)
          visited.add(key(c))
          triedFromHere.push(new Set())
        }
        lastDir = directionBetween(hp[hp.length - 2], hp[hp.length - 1])
        hairpinsRemaining--
        continue
      }
    }

    const forceFinish = path.length > maxSteps * 2
    const centroid = centroidOf(path)
    const tried = triedFromHere[path.length - 1]
    const candidates: { cell: Cell; dir: Dir; weight: number }[] = []

    for (const dir of DIRS) {
      const next: Cell = { col: current.col + dir[0], row: current.row + dir[1] }
      const isEnd = isSameCell(next, end)
      if (forceFinish && !isEnd) continue
      if (!inBounds(next, grid.cols, grid.rows)) continue
      if (visited.has(key(next)) || tried.has(key(next))) continue
      if (isEnd && path.length < minSteps) continue
      if (!isEnd && isNear(next, end) && path.length < minSteps) continue
      if (!hasClearance(next, path, visited)) continue

      let weight = 1 + rand() * 0.6
      if (lastDir && dir[0] === lastDir[0] && dir[1] === lastDir[1]) weight *= config.straightBias
      // Prefer stepping away from where the walk has already been, so it spreads across the
      // canvas instead of curling up in one corner of the grid.
      const distFromCentroid = Math.hypot(next.col - centroid.col, next.row - centroid.row)
      weight *= 1 + distFromCentroid * 0.05
      if (isEnd) {
        // Reachable but not yet urgent right at minSteps; increasingly favored the further past
        // maxSteps the walk has run, so it still converges instead of wandering indefinitely.
        weight = 0.5 + Math.max(0, path.length - maxSteps) * 1.5
      }
      candidates.push({ cell: next, dir, weight })
    }

    if (candidates.length === 0) {
      if (path.length <= 1) return null
      // `visited` means "on the current attempt", not "ever tried" — un-mark the cell being
      // abandoned so a *different* branch can still legitimately pass through it later, then
      // record it against its parent so this same dead end isn't retried from that parent again.
      const popped = path.pop()!
      visited.delete(key(popped))
      triedFromHere.pop()
      triedFromHere[path.length - 1].add(key(popped))
      const newCurrent = path[path.length - 1]
      lastDir = path.length >= 2 ? directionBetween(path[path.length - 2], newCurrent) : null
      continue
    }

    const chosen = weightedPick(candidates, rand)
    path.push(chosen.cell)
    visited.add(key(chosen.cell))
    triedFromHere.push(new Set())
    lastDir = chosen.dir
  }

  return null
}

/** A trivially valid straight-line path between the fixed start/end, used only if the random walk can't find room (should be rare). */
function fallbackCells(grid: GridInfo): Cell[] {
  const { start, end } = anchorCells(grid)
  const cells: Cell[] = []
  for (let c = start.col; c <= end.col; c++) cells.push({ col: c, row: start.row })
  return cells
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}
function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y }
}
function scale(a: Point, s: number): Point {
  return { x: a.x * s, y: a.y * s }
}
function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
function normalize(a: Point): Point {
  const len = Math.hypot(a.x, a.y) || 1
  return { x: a.x / len, y: a.y / len }
}

function quadPoint(from: Point, control: Point, to: Point, t: number): Point {
  const mt = 1 - t
  return {
    x: mt * mt * from.x + 2 * mt * t * control.x + t * t * to.x,
    y: mt * mt * from.y + 2 * mt * t * control.y + t * t * to.y,
  }
}

type Segment = { type: 'line'; from: Point; to: Point } | { type: 'quad'; from: Point; control: Point; to: Point }

/**
 * Turns the blocky grid-cell polyline into a smooth wire by rounding each interior corner with
 * a quadratic bezier (cutting back along both adjacent edges by `cornerRadius`), then samples
 * the whole thing — straights and curves — into an evenly-spaced polyline with per-point tangent
 * angles, which is what collision checks and the ring's rotation use at runtime.
 */
function buildSmoothPath(points: Point[], cornerRadius: number): WirePath {
  if (points.length < 2) {
    const p = points[0] ?? { x: 0, y: 0 }
    const single: WireSample = { x: p.x, y: p.y, angle: 0, t: 0 }
    return { samples: [single], totalLength: 0, start: single, end: single }
  }

  const segments: Segment[] = []
  let cursor = points[0]

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    const next = points[i + 1]

    const inLen = dist(prev, cur)
    const outLen = dist(cur, next)
    const radius = Math.min(cornerRadius, inLen * 0.49, outLen * 0.49)

    const dirIn = normalize(sub(cur, prev))
    const dirOut = normalize(sub(next, cur))
    const a = sub(cur, scale(dirIn, radius))
    const b = add(cur, scale(dirOut, radius))

    segments.push({ type: 'line', from: cursor, to: a })
    segments.push({ type: 'quad', from: a, control: cur, to: b })
    cursor = b
  }
  segments.push({ type: 'line', from: cursor, to: points[points.length - 1] })

  const raw: Point[] = []
  segments.forEach((seg, segIndex) => {
    if (seg.type === 'line') {
      const length = dist(seg.from, seg.to)
      const steps = Math.max(1, Math.ceil(length / SAMPLE_STEP_PX))
      const startStep = segIndex === 0 ? 0 : 1
      for (let s = startStep; s <= steps; s++) {
        const t = s / steps
        raw.push({ x: seg.from.x + (seg.to.x - seg.from.x) * t, y: seg.from.y + (seg.to.y - seg.from.y) * t })
      }
    } else {
      const estLength = dist(seg.from, seg.control) + dist(seg.control, seg.to)
      const steps = Math.max(6, Math.ceil(estLength / SAMPLE_STEP_PX))
      for (let s = 1; s <= steps; s++) {
        raw.push(quadPoint(seg.from, seg.control, seg.to, s / steps))
      }
    }
  })

  const cumulative: number[] = [0]
  for (let i = 1; i < raw.length; i++) {
    cumulative.push(cumulative[i - 1] + dist(raw[i - 1], raw[i]))
  }
  const totalLength = cumulative[cumulative.length - 1] || 1

  const samples: WireSample[] = raw.map((p, i) => {
    const a = raw[Math.max(0, i - 1)]
    const b = raw[Math.min(raw.length - 1, i + 1)]
    return { x: p.x, y: p.y, angle: Math.atan2(b.y - a.y, b.x - a.x), t: cumulative[i] / totalLength }
  })

  return { samples, totalLength, start: samples[0], end: samples[samples.length - 1] }
}
