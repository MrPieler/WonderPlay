import { describe, expect, test } from 'vitest'
import { DIFFICULTIES } from './difficulty'
import { MAP_CONFIG } from './mapConfig'
import { createRandom, findNearestSample, generateWirePath, type WirePath } from './pathGenerator'

// The map's shape no longer varies by difficulty — only the ring's tolerance does. These tests
// exercise MAP_CONFIG directly, and use the largest tolerance across difficulties for the
// clearance-safety check (the worst case for two strands ever being ambiguously close).
const MAX_TOLERANCE = Math.max(...Object.values(DIFFICULTIES).map((d) => d.tolerance))

/**
 * Counts genuine ~180° reversals (a hairpin: two same-sense 90° turns, two grid cells apart, back
 * to back) by scanning the tangent angle across a fixed-width window sized to span one — the
 * generator's hairpin is two grid cells wide (see pathGenerator.ts's `attemptHairpin`), so the
 * window needs to clear roughly 2 cells' worth of samples plus both corners' rounding to catch
 * the full swing. A window this size can cross an ordinary single 90° corner too, but that alone
 * only ever changes the angle by ~π/2 — comfortably under the threshold — so this only fires on
 * an actual reversal.
 */
function countReversals(path: WirePath): number {
  const WINDOW = 90
  let count = 0
  let lastFlagged = -WINDOW
  for (let i = WINDOW; i < path.samples.length; i++) {
    const a = path.samples[i - WINDOW]
    const b = path.samples[i]
    let delta = Math.abs(b.angle - a.angle)
    if (delta > Math.PI) delta = 2 * Math.PI - delta
    if (delta > 2.4 && i - lastFlagged >= WINDOW) {
      count++
      lastFlagged = i
    }
  }
  return count
}

describe('generateWirePath', () => {
  test('always starts in the left section and ends in the right section, at the same height', () => {
    for (let seed = 0; seed < 8; seed++) {
      const width = 1200
      const height = 700
      const path = generateWirePath({ width, height, rand: createRandom(seed) })

      expect(path.start.x).toBeLessThan(width * 0.2)
      expect(path.end.x).toBeGreaterThan(width * 0.8)
      expect(path.start.y).toBeCloseTo(path.end.y, 5)
      expect(Math.abs(path.start.y - height / 2)).toBeLessThan(height * 0.25)
    }
  })

  test('the fixed start/end position does not depend on the random seed', () => {
    const width = 1000
    const height = 640
    const a = generateWirePath({ width, height, rand: createRandom(1) })
    const b = generateWirePath({ width, height, rand: createRandom(99) })

    expect(a.start.x).toBeCloseTo(b.start.x, 5)
    expect(a.start.y).toBeCloseTo(b.start.y, 5)
    expect(a.end.x).toBeCloseTo(b.end.x, 5)
    expect(a.end.y).toBeCloseTo(b.end.y, 5)
  })

  test('produces a long, winding path (many turns) rather than a short or mostly-straight one', () => {
    const path = generateWirePath({ width: 1200, height: 700, rand: createRandom(7) })

    expect(path.totalLength).toBeGreaterThan(1500)

    // Count meaningful direction changes along the sampled polyline as a proxy for "curves and
    // swerves" — a mostly-straight path would have very few.
    let turns = 0
    const STEP = 8
    for (let i = STEP; i < path.samples.length - STEP; i += STEP) {
      const a = path.samples[i - STEP]
      const b = path.samples[i + STEP]
      let delta = Math.abs(b.angle - a.angle)
      if (delta > Math.PI) delta = 2 * Math.PI - delta
      if (delta > 0.3) turns++
    }
    expect(turns).toBeGreaterThan(5)
  })

  test('includes at least a few genuine 180° turns across generated maps', () => {
    let total = 0
    const seeds = 8
    for (let seed = 0; seed < seeds; seed++) {
      const path = generateWirePath({ width: 1200, height: 700, rand: createRandom(seed) })
      total += countReversals(path)
    }
    expect(total).toBeGreaterThanOrEqual(seeds) // averages out to at least ~1 per map
  })

  test('is always completable by tracing it exactly: every point on the path is ~0 away from itself', () => {
    const path = generateWirePath({ width: 900, height: 600, rand: createRandom(7) })

    for (const s of path.samples) {
      const nearest = findNearestSample(path, s.x, s.y)
      expect(nearest.distance).toBeLessThan(0.01)
    }
  })

  test('keeps non-adjacent sections of the wire from crowding each other (no shortcut across the path)', () => {
    const path = generateWirePath({ width: 900, height: 700, rand: createRandom(42) })

    const minGapIndex = Math.floor(path.samples.length * 0.08)
    let minDist = Infinity
    for (let i = 0; i < path.samples.length; i += 5) {
      for (let j = i + minGapIndex; j < path.samples.length; j += 5) {
        const d = Math.hypot(path.samples[i].x - path.samples[j].x, path.samples[i].y - path.samples[j].y)
        if (d < minDist) minDist = d
      }
    }

    expect(minDist).toBeGreaterThan(MAX_TOLERANCE * 2)
  })

  test('produces a valid, non-degenerate path across several seeds and canvas sizes', () => {
    const sizes = [
      { width: 1200, height: 700 },
      { width: 800, height: 500 },
      { width: 320, height: 400 },
    ]
    for (const size of sizes) {
      for (let seed = 0; seed < 6; seed++) {
        const path = generateWirePath({ ...size, rand: createRandom(seed) })
        expect(path.samples.length).toBeGreaterThan(5)
        expect(path.start.x).toBeLessThan(size.width * 0.3)
        expect(path.end.x).toBeGreaterThan(size.width * 0.7)
      }
    }
  })

  test('sanity-checks MAP_CONFIG aims for a long, swervy walk', () => {
    expect(MAP_CONFIG.minSteps).toBeGreaterThanOrEqual(20)
    expect(MAP_CONFIG.straightBias).toBeLessThan(1)
  })
})
