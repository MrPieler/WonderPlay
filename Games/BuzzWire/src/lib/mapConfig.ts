export interface MapConfig {
  /** Base grid cell size in px the winding path is built on. */
  cellSize: number
  minSteps: number
  maxSteps: number
  /** Weight multiplier favoring continuing in the same direction over turning; below 1 favors turning. */
  straightBias: number
  /** Corner-rounding radius, as a fraction of cellSize. */
  cornerRadiusFactor: number
}

/**
 * The one map shape every difficulty shares — long, with frequent turns. Difficulty only changes
 * the ring's safe tolerance (see lib/difficulty.ts), never the wire's length or how it winds.
 */
export const MAP_CONFIG: MapConfig = {
  cellSize: 64,
  minSteps: 34,
  maxSteps: 48,
  straightBias: 0.8,
  cornerRadiusFactor: 0.42,
}
