export const LANE_WIDTH = 300
// The pin deck spans most of the lane's width (as on a real lane, where the back row nearly
// reaches both gutters) — spacing/row-spacing keep the standard equilateral triangle ratio.
export const PIN_RADIUS = 14
export const PIN_SPACING = 58
export const PIN_ROW_SPACING = 50
export const BACK_WALL = 200

export type PinState = 'standing' | 'falling' | 'down'

export interface Pin {
  id: number
  /** Resting lane-space position — where the pin returns to on reset. */
  baseX: number
  baseY: number
  /** Current lane-space position, which drifts as the pin is knocked around. */
  x: number
  y: number
  /** Current velocity, in lane-space units/s — driven by collisions with the ball and other pins. */
  vx: number
  vy: number
  radius: number
  state: PinState
  /** Seconds since this pin started falling. */
  fallTimer: number
  /** Seconds remaining in the "pop back up" animation after a reset. */
  resetTimer: number
  knockDirX: number
  knockDirY: number
}

/**
 * The standard ten-pin triangle: 1 pin, then rows of 2/3/4 behind it, spaced in a regular
 * triangular packing. The head pin sits at `laneLength`, nearest the bowler.
 *
 * `jitter` offsets each pin's resting x position by a small random amount (real pins are never
 * racked pixel-perfect) — without it, a dead-center throw sees a perfectly symmetric deck with
 * no natural side to break toward, and stalls in a straight line down the middle instead of
 * fanning out into the rest of the pins.
 */
export function buildPins(laneLength: number, jitter = 0): Pin[] {
  const headY = laneLength
  const rows = [[0], [-0.5, 0.5], [-1, 0, 1], [-1.5, -0.5, 0.5, 1.5]]
  const pins: Pin[] = []
  let id = 0
  rows.forEach((row, rowIndex) => {
    row.forEach((xUnits) => {
      const baseX = xUnits * PIN_SPACING + (jitter ? (Math.random() - 0.5) * 2 * jitter : 0)
      const baseY = headY + rowIndex * PIN_ROW_SPACING
      pins.push({
        id: id++,
        baseX,
        baseY,
        x: baseX,
        y: baseY,
        vx: 0,
        vy: 0,
        radius: PIN_RADIUS,
        state: 'standing',
        fallTimer: 0,
        resetTimer: 0,
        knockDirX: 1,
        knockDirY: 0,
      })
    })
  })
  return pins
}

/** Resets every pin to standing at its base position, with a "pop back up" animation. */
export function resetPins(pins: Pin[], resetDuration: number): void {
  for (const pin of pins) {
    pin.state = 'standing'
    pin.fallTimer = 0
    pin.resetTimer = resetDuration
    pin.x = pin.baseX
    pin.y = pin.baseY
    pin.vx = 0
    pin.vy = 0
  }
}
