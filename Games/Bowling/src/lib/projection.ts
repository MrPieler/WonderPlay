import { BACK_WALL, LANE_WIDTH } from './pins'

export interface ProjectedPoint {
  x: number
  y: number
  /** px-per-lane-unit at this depth — scale sprites and radii by it for a consistent 3D read. */
  scale: number
}

export interface Projection {
  project: (laneX: number, laneY: number) => ProjectedPoint
  /** Lane-space depth of the back wall — the far edge of the playable pit. */
  maxLaneY: number
  centerX: number
  nearY: number
  farY: number
  nearHalfWidth: number
  farHalfWidth: number
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value))
}

/**
 * Builds a cheap pseudo-3D perspective for the lane: physics runs in flat lane-space units
 * (x across the lane, y down its length), and this maps a lane-space point to screen pixels as
 * a trapezoid — narrow and high up for "far away", wide and low for "close to the bowler".
 */
export function buildProjection(viewWidth: number, viewHeight: number, laneLength: number): Projection {
  const maxLaneY = laneLength + BACK_WALL
  // Leaves room below the ball's resting spot for the pull-back throw gesture, and a strip of
  // foreground floor at the bottom for the approach-area decor.
  const nearY = viewHeight * 0.8
  const farY = viewHeight * 0.1
  const nearHalfWidth = Math.min(viewWidth * 0.42, 260)
  const farHalfWidth = Math.min(viewWidth * 0.15, 95)
  const centerX = viewWidth / 2

  function project(laneX: number, laneY: number): ProjectedPoint {
    const t = clamp(laneY / maxLaneY, 0, 1.25)
    const y = lerp(nearY, farY, t)
    const halfWidth = lerp(nearHalfWidth, farHalfWidth, t)
    const scale = halfWidth / (LANE_WIDTH / 2)
    const x = centerX + (laneX / (LANE_WIDTH / 2)) * halfWidth
    return { x, y, scale }
  }

  return { project, maxLaneY, centerX, nearY, farY, nearHalfWidth, farHalfWidth }
}
