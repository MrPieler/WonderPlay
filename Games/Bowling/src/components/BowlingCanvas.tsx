import { useEffect, useLayoutEffect, useRef } from 'react'
import { useTheme } from '../../../../shell'
import { useMeasuredSize } from '../../../../shell/hooks/useMeasuredSize'
import { THROWS_PER_GAME } from '../lib/difficulty'
import { buildProjection, clamp, lerp, type ProjectedPoint, type Projection } from '../lib/projection'
import { buildPins, resetPins, LANE_WIDTH, type Pin } from '../lib/pins'
import { messageForPoints, throwPoints } from '../lib/scoring'
import { playGutter, playPinHit, playPopup, playStrike, playThrow } from '../lib/soundEffects'

interface BowlingCanvasProps {
  laneLength: number
  bumpersEnabled: boolean
  onThrowComplete: (points: number) => void
  onGameComplete: () => void
}

// --- Physics tuning (lane-space units — arbitrary but internally consistent) ---------------
const FRICTION = 46 // rolling friction, units/s^2
const GUTTER_FRICTION = 130
const MAX_SPEED = 620
const MIN_LAUNCH_POWER = 0.06
const STOP_SPEED = 14
const CURVE_STRENGTH = 2.6
const SPIN_DECAY = 0.985
const FALL_DURATION = 0.55
const RESET_DURATION = 0.45
const POPUP_DURATION = 1.4
const SETTLE_MIN_WAIT = 0.25
const BALL_RADIUS = 15
const LANE_HALF = LANE_WIDTH / 2
const GUTTER_WIDTH = 22

// Collision physics: a mass ratio (ball >> pin) so the ball barely slows on a single pin but
// sends the pin flying, plus a little inelasticity so pins mostly get shoved rather than bouncing.
const BALL_MASS = 7
const PIN_MASS = 1
const BALL_PIN_RESTITUTION = 0.25
const PIN_PIN_RESTITUTION = 0.15
const PIN_SKID_FRICTION = 180 // units/s^2, decel while a knocked pin slides
const PIN_STOP_SPEED = 18
const TOPPLE_SPEED = 55 // impact speed above which a standing pin gets knocked over
// A heavy-ball-hits-light-pin elastic impulse can put the pin's post-collision speed well above
// the ball's own. This must stay above the ball's own MAX_SPEED: capping it any lower let the
// ball (still faster than the capped pin) re-collide with the same pin on the very next frame,
// again and again, so the pin never outran the ball and the two just plowed forward together
// instead of the pin flying off to hit its neighbours.
const MAX_PIN_SPEED = 600
// Small collision forgiveness so a near-miss still counts as contact — real pins aren't
// infinitely thin points, and without this a dead-center ball passes exactly between the two
// pins directly behind the headpin (they're spaced almost exactly one ball-width apart).
const COLLISION_PAD = 6
// A hit that lands squarely on the headpin (no leftover sideways motion) has no natural lateral
// component to carry into the pins behind it — physically it just splits the deck straight down
// the middle and leaves the back corners standing, same as a real head-on (non-pocket) shot.
// Real strike shots always enter with a bit of angle; this nudges a near-dead-center hit into
// "the pocket" on whichever side it's already leaning, so the chain reaction actually spreads
// instead of stalling on the centerline.
const POCKET_KICK_ANGLE = 0.2 // |nx| below this counts as "nearly head-on"
const POCKET_KICK_STRENGTH = 2.0
// Pins are never set down perfectly on the real rack — jittering their rest position by a couple
// of units avoids a perfectly symmetric deck, which otherwise gives a dead-center hit no
// side to naturally break toward.
const PIN_JITTER = 3

type Phase = 'ready' | 'aiming' | 'rolling' | 'settling' | 'popup' | 'done'

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  spin: number
  radius: number
  moving: boolean
  inGutter: boolean
  rotation: number
  hue: number
  trail: { x: number; y: number; life: number }[]
}

interface FloatingText {
  text: string
  color: string
  x: number
  y: number
  life: number
  big: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
  rot: number
  vr: number
}

interface Drag {
  startX: number
  startY: number
  curX: number
  curY: number
}

interface Engine {
  laneLength: number
  proj: Projection
  ball: Ball
  pins: Pin[]
  particles: Particle[]
  floatingTexts: FloatingText[]
  phase: Phase
  phaseTimer: number
  throwIndex: number
  standingAtThrowStart: number
  drag: Drag | null
  bumpersEnabled: boolean
}

/** The ball always starts dead-center on the lane (x=0) — lined up with the head pin, as on a
 *  real approach. */
function createBall(): Ball {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    spin: 0,
    radius: BALL_RADIUS,
    moving: false,
    inGutter: false,
    rotation: 0,
    hue: 190 + Math.floor(Math.random() * 140),
    trail: [],
  }
}

function createEngine(laneLength: number, viewW: number, viewH: number, bumpersEnabled: boolean): Engine {
  return {
    laneLength,
    proj: buildProjection(viewW, viewH, laneLength),
    ball: createBall(),
    pins: buildPins(laneLength, PIN_JITTER),
    particles: [],
    floatingTexts: [],
    phase: 'ready',
    phaseTimer: 0,
    throwIndex: 0,
    standingAtThrowStart: 0,
    drag: null,
    bumpersEnabled,
  }
}

interface EngineCallbacks {
  onThrowComplete: (points: number) => void
  onGameComplete: () => void
}

// --- Physics step -----------------------------------------------------------------------------

function updateBall(engine: Engine, dt: number): void {
  const ball = engine.ball
  if (!ball.moving) return

  const gutterLimit = LANE_HALF - ball.radius * 0.3

  if (engine.bumpersEnabled) {
    // Sideguards: bounce the ball back onto the lane instead of letting it fall in the gutter.
    if (ball.x > gutterLimit) {
      ball.x = gutterLimit
      ball.vx = -Math.abs(ball.vx) * 0.5
    } else if (ball.x < -gutterLimit) {
      ball.x = -gutterLimit
      ball.vx = Math.abs(ball.vx) * 0.5
    }
    ball.inGutter = false
  } else {
    ball.inGutter = Math.abs(ball.x) > gutterLimit
  }

  if (!ball.inGutter) {
    const speedFrac = clamp(Math.hypot(ball.vx, ball.vy) / MAX_SPEED, 0, 1)
    ball.vx += ball.spin * CURVE_STRENGTH * speedFrac * dt
    ball.spin *= SPIN_DECAY
  } else {
    ball.spin *= 0.9
  }

  const speed = Math.hypot(ball.vx, ball.vy)
  const friction = ball.inGutter ? GUTTER_FRICTION : FRICTION
  if (speed > 0) {
    const dec = Math.min(friction * dt, speed)
    ball.vx -= (ball.vx / speed) * dec
    ball.vy -= (ball.vy / speed) * dec
  }

  ball.x += ball.vx * dt
  ball.y += ball.vy * dt
  ball.rotation += (Math.hypot(ball.vx, ball.vy) / ball.radius) * dt

  ball.trail.push({ x: ball.x, y: ball.y, life: 1 })
  if (ball.trail.length > 14) ball.trail.shift()
  ball.trail.forEach((t) => (t.life -= dt * 2.2))
  ball.trail = ball.trail.filter((t) => t.life > 0)

  if (!ball.inGutter) {
    for (const pin of engine.pins) {
      if (pin.state === 'down') continue
      collideBallPin(ball, pin)
    }
  }

  const finalSpeed = Math.hypot(ball.vx, ball.vy)
  const pastPins = ball.y > engine.proj.maxLaneY + 20
  if (finalSpeed < STOP_SPEED || pastPins) {
    ball.moving = false
    if (ball.inGutter) playGutter()
    engine.phase = 'settling'
    engine.phaseTimer = 0
  }
}

function knockPin(pin: Pin): void {
  if (pin.state !== 'standing') return
  pin.state = 'falling'
  pin.fallTimer = 0
  playPinHit()
}

function clampPinSpeed(pin: Pin): void {
  const speed = Math.hypot(pin.vx, pin.vy)
  if (speed <= MAX_PIN_SPEED) return
  const scale = MAX_PIN_SPEED / speed
  pin.vx *= scale
  pin.vy *= scale
}

/** Ball-vs-pin impact: an elastic-ish impulse along the contact normal, weighted by mass, so the
 *  heavy ball barely slows while the light pin gets sent flying — then separates the two so they
 *  don't keep overlapping next frame. */
function collideBallPin(ball: Ball, pin: Pin): void {
  const dx = pin.x - ball.x
  const dy = pin.y - ball.y
  const dist = Math.hypot(dx, dy) || 0.0001
  const minDist = ball.radius + pin.radius + COLLISION_PAD
  if (dist >= minDist) return

  const nx = dx / dist
  const ny = dy / dist
  const relVelAlongNormal = (ball.vx - pin.vx) * nx + (ball.vy - pin.vy) * ny

  if (relVelAlongNormal > 0) {
    const invBall = 1 / BALL_MASS
    const invPin = 1 / PIN_MASS
    const j = (-(1 + BALL_PIN_RESTITUTION) * relVelAlongNormal) / (invBall + invPin)
    ball.vx += j * invBall * nx
    ball.vy += j * invBall * ny
    pin.vx -= j * invPin * nx
    pin.vy -= j * invPin * ny
    if (Math.abs(nx) < POCKET_KICK_ANGLE) {
      const dir = nx !== 0 ? Math.sign(nx) : Math.random() < 0.5 ? 1 : -1
      pin.vx += POCKET_KICK_STRENGTH * relVelAlongNormal * (1 - Math.abs(nx) / POCKET_KICK_ANGLE) * dir
    }
    clampPinSpeed(pin)
  }

  const overlap = minDist - dist
  const totalInv = 1 / BALL_MASS + 1 / PIN_MASS
  ball.x -= nx * (overlap * (1 / BALL_MASS)) / totalInv
  ball.y -= ny * (overlap * (1 / BALL_MASS)) / totalInv
  pin.x += nx * (overlap * (1 / PIN_MASS)) / totalInv
  pin.y += ny * (overlap * (1 / PIN_MASS)) / totalInv

  if (pin.state === 'standing') {
    pin.knockDirX = nx + (Math.random() - 0.5) * 0.3
    pin.knockDirY = ny + (Math.random() - 0.5) * 0.15
    knockPin(pin)
  }
}

/** Pin-vs-pin impact: same impulse approach as the ball, but equal masses and mostly-inelastic —
 *  pins shove each other rather than bouncing, which is what gives strikes their chain reaction. */
function collidePinPin(a: Pin, b: Pin): void {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.hypot(dx, dy) || 0.0001
  const minDist = a.radius + b.radius + COLLISION_PAD
  if (dist >= minDist) return

  const nx = dx / dist
  const ny = dy / dist
  const relVelAlongNormal = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
  const impactSpeed = Math.abs(relVelAlongNormal)

  if (relVelAlongNormal > 0) {
    const j = (-(1 + PIN_PIN_RESTITUTION) * relVelAlongNormal) / (2 / PIN_MASS)
    a.vx += (j / PIN_MASS) * nx
    a.vy += (j / PIN_MASS) * ny
    b.vx -= (j / PIN_MASS) * nx
    b.vy -= (j / PIN_MASS) * ny
    clampPinSpeed(a)
    clampPinSpeed(b)
  }

  const overlap = (minDist - dist) / 2
  a.x -= nx * overlap
  a.y -= ny * overlap
  b.x += nx * overlap
  b.y += ny * overlap

  if (impactSpeed > TOPPLE_SPEED) {
    if (a.state === 'standing') {
      a.knockDirX = -nx
      a.knockDirY = -ny
      knockPin(a)
    }
    if (b.state === 'standing') {
      b.knockDirX = nx
      b.knockDirY = ny
      knockPin(b)
    }
  }
}

/** Advances every pin still in play: skid-friction integration, pin-vs-pin collisions (this is
 *  what propagates a hit into a chain reaction), then fall/reset timers. Runs every frame
 *  regardless of phase, since knocked pins keep sliding into their neighbours after the ball
 *  has already left the deck. */
function stepPins(engine: Engine, dt: number): void {
  for (const pin of engine.pins) {
    if (pin.state === 'down') continue
    const speed = Math.hypot(pin.vx, pin.vy)
    if (speed > 0) {
      const newSpeed = Math.max(0, speed - PIN_SKID_FRICTION * dt)
      if (newSpeed < PIN_STOP_SPEED) {
        pin.vx = 0
        pin.vy = 0
      } else {
        const scale = newSpeed / speed
        pin.vx *= scale
        pin.vy *= scale
      }
    }
    pin.x += pin.vx * dt
    pin.y += pin.vy * dt
  }

  for (let i = 0; i < engine.pins.length; i++) {
    const a = engine.pins[i]
    if (a.state === 'down') continue
    for (let j = i + 1; j < engine.pins.length; j++) {
      const b = engine.pins[j]
      if (b.state === 'down') continue
      collidePinPin(a, b)
    }
  }

  for (const pin of engine.pins) {
    if (pin.state === 'falling') {
      pin.fallTimer += dt
      if (pin.fallTimer >= FALL_DURATION) {
        pin.state = 'down'
        pin.fallTimer = FALL_DURATION
        pin.vx = 0
        pin.vy = 0
      }
    } else if (pin.state === 'standing' && pin.resetTimer > 0) {
      pin.resetTimer = Math.max(0, pin.resetTimer - dt)
    }
  }
}

function allPinsSettled(engine: Engine): boolean {
  return engine.pins.every((p) => p.state !== 'falling' || p.fallTimer >= FALL_DURATION)
}

function spawnFloatingScore(engine: Engine, text: string, color: string, laneY: number, big: boolean): void {
  engine.floatingTexts.push({ text, color, x: 0, y: laneY, life: 1.6, big })
}

function spawnConfetti(engine: Engine, viewW: number): void {
  const colors = ['#ffd23f', '#ff5d5d', '#7CFFB2', '#8ecaff', '#ff9f1c']
  for (let i = 0; i < 70; i++) {
    engine.particles.push({
      x: Math.random() * viewW,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 120,
      vy: 80 + Math.random() * 140,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 5 + Math.random() * 5,
      life: 2.6 + Math.random(),
    })
  }
}

function finishThrow(engine: Engine, viewW: number, callbacks: EngineCallbacks): void {
  const standingAfter = engine.pins.filter((p) => p.state === 'standing').length
  const points = throwPoints(engine.standingAtThrowStart, standingAfter)
  const message = messageForPoints(points)

  spawnFloatingScore(engine, `+${points}`, colorForTone(message.tone), engine.laneLength * 0.45, points >= 7)
  spawnFloatingScore(engine, message.text, colorForTone(message.tone), engine.laneLength * 0.45 - 50, points >= 7)

  if (points >= 10) {
    playStrike()
    spawnConfetti(engine, viewW)
  } else {
    playPopup()
  }

  callbacks.onThrowComplete(points)
  engine.phase = 'popup'
  engine.phaseTimer = 0
}

function colorForTone(tone: string): string {
  switch (tone) {
    case 'strike':
      return '#ffd23f'
    case 'great':
      return '#7CFFB2'
    case 'nice':
      return '#8ecaff'
    case 'ok':
      return '#cdd8ff'
    default:
      return '#ff8a8a'
  }
}

function advanceAfterPopup(engine: Engine, callbacks: EngineCallbacks): void {
  engine.throwIndex++
  if (engine.throwIndex >= THROWS_PER_GAME) {
    engine.phase = 'done'
    callbacks.onGameComplete()
    return
  }

  resetPins(engine.pins, RESET_DURATION)
  engine.ball = createBall()
  engine.phase = 'ready'
  engine.phaseTimer = 0
}

function update(engine: Engine, dt: number, viewW: number, viewH: number, callbacks: EngineCallbacks): void {
  if (engine.phase === 'rolling') {
    updateBall(engine, dt)
  }
  // Pins keep sliding and colliding with their neighbours after the ball has moved on, so this
  // runs every frame rather than only while the ball is rolling.
  stepPins(engine, dt)

  if (engine.phase === 'settling') {
    engine.phaseTimer += dt
    if (allPinsSettled(engine) && engine.phaseTimer > SETTLE_MIN_WAIT) {
      finishThrow(engine, viewW, callbacks)
    }
  } else if (engine.phase === 'popup') {
    engine.phaseTimer += dt
    if (engine.phaseTimer > POPUP_DURATION) {
      advanceAfterPopup(engine, callbacks)
    }
  }

  engine.floatingTexts.forEach((f) => {
    f.life -= dt
    f.y -= dt * 15
  })
  engine.floatingTexts = engine.floatingTexts.filter((f) => f.life > 0)

  engine.particles.forEach((p) => {
    p.vy += 200 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.rot += p.vr * dt
    p.life -= dt
  })
  engine.particles = engine.particles.filter((p) => p.life > 0 && p.y < viewH + 40)
}

// --- Drag / throw math --------------------------------------------------------------------------

interface DragResult {
  power: number
  ux: number
  uy: number
  rawDx: number
  rawDy: number
}

function computeDrag(drag: Drag, viewH: number): DragResult {
  const dx = drag.curX - drag.startX
  const dy = drag.curY - drag.startY
  // Cap the pull distance to whatever room is actually left below the ball, so max power is
  // always reachable by dragging to the bottom edge — even on short screens.
  const edgeMargin = 20
  const availableBelow = Math.max(viewH - drag.startY - edgeMargin, 60)
  const maxDrag = Math.min(availableBelow, 220)
  const len = Math.min(Math.hypot(dx, dy), maxDrag)
  const power = len / maxDrag
  const throwDirX = -dx
  const throwDirY = -dy
  const mag = Math.hypot(throwDirX, throwDirY) || 1
  return { power, ux: throwDirX / mag, uy: throwDirY / mag, rawDx: dx, rawDy: dy }
}

// --- Rendering ------------------------------------------------------------------------------

function drawTrapezoidPath(ctx: CanvasRenderingContext2D, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }): void {
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.lineTo(c.x, c.y)
  ctx.lineTo(d.x, d.y)
  ctx.closePath()
}

function drawTrapezoid(ctx: CanvasRenderingContext2D, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }): void {
  ctx.beginPath()
  drawTrapezoidPath(ctx, a, b, c, d)
  ctx.fill()
}

function easeOutBack(t: number): number {
  const c1 = 1.4
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** Everything outside the lane itself — ambient wash, ceiling lights, side walls, a glimpse of
 *  neighbouring lanes, and a carpeted floor in the foreground — so the lane doesn't float in
 *  blank space. Drawn once per frame; every element is placed deterministically (no randomness)
 *  so nothing flickers between frames. */
function drawBackground(ctx: CanvasRenderingContext2D, engine: Engine, viewW: number, viewH: number, accentColor: string): void {
  const proj = engine.proj
  // Extends all the way to the back wall (not just a fraction of it) so the last pin row —
  // which sits close behind the head pin — always renders on the wood, never past its edge.
  const farDepth = proj.maxLaneY

  const sky = ctx.createLinearGradient(0, 0, 0, viewH)
  sky.addColorStop(0, '#0a0f2c')
  sky.addColorStop(0.45, '#171238')
  sky.addColorStop(1, '#241534')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, viewW, viewH)

  const neighborNearInner = LANE_HALF + GUTTER_WIDTH * 2
  const neighborNearOuter = neighborNearInner + LANE_WIDTH

  for (const side of [-1, 1]) {
    const nearInner = proj.project(side * neighborNearInner, 0)
    const nearOuter = proj.project(side * neighborNearOuter, 0)
    const farInner = proj.project(side * neighborNearInner, farDepth)
    const farOuter = proj.project(side * neighborNearOuter, farDepth)

    ctx.save()
    ctx.globalAlpha = 0.5
    const laneGrad = ctx.createLinearGradient(0, nearInner.y, 0, farInner.y)
    laneGrad.addColorStop(0, '#5c4128')
    laneGrad.addColorStop(1, '#2c2019')
    ctx.fillStyle = laneGrad
    drawTrapezoid(ctx, nearInner, nearOuter, farOuter, farInner)
    ctx.restore()

    const edgeX = side < 0 ? 0 : viewW
    ctx.fillStyle = 'rgba(6, 6, 22, 0.92)'
    ctx.beginPath()
    ctx.moveTo(nearOuter.x, nearOuter.y)
    ctx.lineTo(edgeX, viewH)
    ctx.lineTo(edgeX, 0)
    ctx.lineTo(farOuter.x, farOuter.y)
    ctx.closePath()
    ctx.fill()

    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 3
    ctx.shadowColor = accentColor
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.moveTo(nearOuter.x, nearOuter.y)
    ctx.lineTo(farOuter.x, farOuter.y)
    ctx.stroke()
    ctx.restore()
  }

  const lightCount = 5
  for (let i = 0; i < lightCount; i++) {
    const lx = (viewW * (i + 0.5)) / lightCount
    const ly = viewH * 0.05
    const r = Math.min(viewW, viewH) * 0.08
    const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, r)
    ctx.save()
    if (i % 2 === 0) {
      glow.addColorStop(0, 'rgba(255, 244, 214, 0.55)')
      glow.addColorStop(1, 'rgba(255, 244, 214, 0)')
      ctx.fillStyle = glow
    } else {
      ctx.globalAlpha = 0.45
      glow.addColorStop(0, accentColor)
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow
    }
    ctx.beginPath()
    ctx.arc(lx, ly, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  const floorTop = proj.nearY
  if (floorTop < viewH) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, floorTop, viewW, viewH - floorTop)
    ctx.clip()

    const floorGrad = ctx.createLinearGradient(0, floorTop, 0, viewH)
    floorGrad.addColorStop(0, '#221735')
    floorGrad.addColorStop(1, '#120b1e')
    ctx.fillStyle = floorGrad
    ctx.fillRect(0, floorTop, viewW, viewH - floorTop)

    const cell = 34
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1
    let row = 0
    for (let y = floorTop; y < viewH + cell; y += cell / 2, row++) {
      const offset = row % 2 === 0 ? 0 : cell / 2
      for (let x = -cell + offset; x < viewW + cell; x += cell) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + cell / 2, y + cell / 2)
        ctx.stroke()
      }
    }
    ctx.restore()
  }
}

/** How far a sideguard's top surface sits above the lane, in screen px at scale=1 — scaled per
 *  point by perspective like everything else, so the rail reads as tall near the bowler and
 *  tapers with distance same as the lane itself. */
const SIDEGUARD_HEIGHT = 26

/** Offsets a projected lane-surface point straight up in screen space to the top of the rail. */
function raiseRail(p: ProjectedPoint, height: number): { x: number; y: number } {
  return { x: p.x, y: p.y - height * p.scale }
}

/** The raised bumper rails along both gutters when sideguards are on — polished stainless tubing,
 *  tall enough to clearly read as a physical guard rather than a painted stripe on the lane. */
function drawSideguards(ctx: CanvasRenderingContext2D, engine: Engine): void {
  if (!engine.bumpersEnabled) return
  const proj = engine.proj
  // Extends all the way to the back wall (not just a fraction of it) so the last pin row —
  // which sits close behind the head pin — always renders on the wood, never past its edge.
  const farDepth = proj.maxLaneY

  for (const side of [-1, 1]) {
    const innerNear = proj.project(side * LANE_HALF, 0)
    const outerNear = proj.project(side * (LANE_HALF + GUTTER_WIDTH), 0)
    const innerFar = proj.project(side * LANE_HALF, farDepth)
    const outerFar = proj.project(side * (LANE_HALF + GUTTER_WIDTH), farDepth)

    const topInnerNear = raiseRail(innerNear, SIDEGUARD_HEIGHT)
    const topInnerFar = raiseRail(innerFar, SIDEGUARD_HEIGHT)
    const topOuterNear = raiseRail(outerNear, SIDEGUARD_HEIGHT)
    const topOuterFar = raiseRail(outerFar, SIDEGUARD_HEIGHT)

    // Inner face: the vertical wall facing the ball — from this angle it's what actually sells
    // "raised rail", so it gets the strongest chrome gradient (bright top, steel-grey base).
    const faceGrad = ctx.createLinearGradient(0, topInnerNear.y, 0, innerNear.y)
    faceGrad.addColorStop(0, '#f6f9fb')
    faceGrad.addColorStop(0.3, '#aebac4')
    faceGrad.addColorStop(0.55, '#707c87')
    faceGrad.addColorStop(0.8, '#9aa6b0')
    faceGrad.addColorStop(1, '#4a525b')
    ctx.fillStyle = faceGrad
    drawTrapezoid(ctx, topInnerNear, topInnerFar, innerFar, innerNear)

    // Top surface: brushed-steel band with a bright specular strip down the middle, like light
    // catching a polished tube.
    const topGrad = ctx.createLinearGradient(topInnerNear.x, 0, topOuterNear.x, 0)
    topGrad.addColorStop(0, '#d7dee4')
    topGrad.addColorStop(0.35, '#8f9aa4')
    topGrad.addColorStop(0.5, '#fdfeff')
    topGrad.addColorStop(0.65, '#7c8894')
    topGrad.addColorStop(1, '#4f5761')
    ctx.fillStyle = topGrad
    drawTrapezoid(ctx, topInnerNear, topOuterNear, topOuterFar, topInnerFar)

    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(topInnerNear.x, topInnerNear.y)
    ctx.lineTo(topInnerFar.x, topInnerFar.y)
    ctx.stroke()

    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(innerNear.x, innerNear.y)
    ctx.lineTo(innerFar.x, innerFar.y)
    ctx.stroke()
  }
}

function drawLane(ctx: CanvasRenderingContext2D, engine: Engine): void {
  const proj = engine.proj
  // Extends all the way to the back wall (not just a fraction of it) so the last pin row —
  // which sits close behind the head pin — always renders on the wood, never past its edge.
  const farDepth = proj.maxLaneY
  const nearL = proj.project(-LANE_HALF, 0)
  const nearR = proj.project(LANE_HALF, 0)
  const farL = proj.project(-LANE_HALF, farDepth)
  const farR = proj.project(LANE_HALF, farDepth)

  ctx.fillStyle = '#20305f'
  drawTrapezoid(
    ctx,
    proj.project(-LANE_HALF - GUTTER_WIDTH, 0),
    proj.project(LANE_HALF + GUTTER_WIDTH, 0),
    proj.project(LANE_HALF + GUTTER_WIDTH * 0.4, farDepth),
    proj.project(-LANE_HALF - GUTTER_WIDTH * 0.4, farDepth),
  )

  const woodGrad = ctx.createLinearGradient(0, nearL.y, 0, farL.y)
  woodGrad.addColorStop(0, '#e8b978')
  woodGrad.addColorStop(0.4, '#d9a25f')
  woodGrad.addColorStop(1, '#f0d3a3')
  ctx.fillStyle = woodGrad
  drawTrapezoid(ctx, nearL, nearR, farR, farL)

  ctx.save()
  ctx.beginPath()
  drawTrapezoidPath(ctx, nearL, nearR, farR, farL)
  ctx.clip()
  ctx.strokeStyle = 'rgba(120, 78, 30, 0.12)'
  ctx.lineWidth = 1
  const planks = 10
  for (let i = 1; i < planks; i++) {
    const lx = -LANE_HALF + (LANE_WIDTH * i) / planks
    const a = proj.project(lx, 0)
    const b = proj.project(lx, farDepth)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  ctx.restore()

  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(nearL.x, nearL.y)
  ctx.lineTo(farL.x, farL.y)
  ctx.moveTo(nearR.x, nearR.y)
  ctx.lineTo(farR.x, farR.y)
  ctx.stroke()

  ctx.fillStyle = 'rgba(150, 40, 40, 0.35)'
  for (let i = -2; i <= 2; i++) {
    const p = proj.project(i * 22, proj.maxLaneY * 0.35)
    const s = p.scale
    ctx.beginPath()
    ctx.moveTo(p.x, p.y - 10 * s)
    ctx.lineTo(p.x - 5 * s, p.y + 6 * s)
    ctx.lineTo(p.x + 5 * s, p.y + 6 * s)
    ctx.closePath()
    ctx.fill()
  }

  ctx.strokeStyle = 'rgba(215, 38, 61, 0.75)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(nearL.x, nearL.y - 2)
  ctx.lineTo(nearR.x, nearR.y - 2)
  ctx.stroke()

}

/** The business end of the lane: padded kickback walls flanking the pit, a curtained backstop
 *  behind the deck, and a lit masking strip above it — the parts of a real alley that stop and
 *  hide the pinsetter machinery, instead of the lane just running off into flat void. */
function drawPinDeckEnd(ctx: CanvasRenderingContext2D, engine: Engine, accentColor: string): void {
  const proj = engine.proj
  const farDepth = proj.maxLaneY
  // Starts just behind the back pin row (laneLength + 150) so the kickbacks never clip standing pins.
  const kickbackDepth = Math.max(farDepth - 60, engine.laneLength + 155)

  for (const side of [-1, 1]) {
    const innerNear = proj.project(side * LANE_HALF, kickbackDepth)
    const innerFar = proj.project(side * LANE_HALF, farDepth)
    const outerNear = proj.project(side * (LANE_HALF + 34), kickbackDepth)
    const outerFar = proj.project(side * (LANE_HALF + 26), farDepth)

    const grad = ctx.createLinearGradient(0, innerNear.y, 0, innerFar.y)
    grad.addColorStop(0, '#7a1f2b')
    grad.addColorStop(1, '#3c0d15')
    ctx.fillStyle = grad
    drawTrapezoid(ctx, innerNear, outerNear, outerFar, innerFar)

    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(innerNear.x, innerNear.y)
    ctx.lineTo(innerFar.x, innerFar.y)
    ctx.stroke()
  }

  const farL = proj.project(-LANE_HALF - 30, farDepth)
  const farR = proj.project(LANE_HALF + 30, farDepth)
  const s = farL.scale
  const curtainH = 50 * s

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(farL.x, farL.y)
  ctx.lineTo(farR.x, farR.y)
  ctx.lineTo(farR.x, farR.y - curtainH)
  ctx.lineTo(farL.x, farL.y - curtainH)
  ctx.closePath()
  ctx.clip()

  const curtainGrad = ctx.createLinearGradient(0, farL.y - curtainH, 0, farL.y)
  curtainGrad.addColorStop(0, '#1a1024')
  curtainGrad.addColorStop(1, '#050308')
  ctx.fillStyle = curtainGrad
  ctx.fillRect(farL.x, farL.y - curtainH, farR.x - farL.x, curtainH)

  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = 1
  const channels = 12
  for (let i = 0; i <= channels; i++) {
    const t = i / channels
    const x = lerp(farL.x, farR.x, t)
    ctx.beginPath()
    ctx.moveTo(x, farL.y)
    ctx.lineTo(x, farL.y - curtainH)
    ctx.stroke()
  }
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.6
  const glow = ctx.createLinearGradient(farL.x, 0, farR.x, 0)
  glow.addColorStop(0, 'rgba(0,0,0,0)')
  glow.addColorStop(0.5, accentColor)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.strokeStyle = glow
  ctx.lineWidth = 2.5
  ctx.shadowColor = accentColor
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.moveTo(farL.x, farL.y - curtainH)
  ctx.lineTo(farR.x, farR.y - curtainH)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.fillStyle = 'rgba(255, 244, 214, 0.9)'
  ctx.shadowColor = 'rgba(255, 244, 214, 0.9)'
  ctx.shadowBlur = 6
  const bulbs = 7
  for (let i = 0; i < bulbs; i++) {
    const t = (i + 0.5) / bulbs
    const x = lerp(farL.x, farR.x, t)
    ctx.beginPath()
    ctx.arc(x, farL.y - curtainH, 1.6 * s, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawPin(ctx: CanvasRenderingContext2D, pin: Pin, p: ProjectedPoint): void {
  let fallProgress = 0
  if (pin.state === 'falling') fallProgress = clamp(pin.fallTimer / FALL_DURATION, 0, 1)
  else if (pin.state === 'down') fallProgress = 1

  let popScale = 1
  if (pin.state === 'standing' && pin.resetTimer > 0) {
    const rt = 1 - clamp(pin.resetTimer / RESET_DURATION, 0, 1)
    popScale = easeOutBack(rt)
  }
  if (popScale <= 0.02) return

  const s = p.scale
  ctx.save()
  ctx.translate(p.x, p.y)

  ctx.save()
  ctx.globalAlpha = 0.35 * (1 - fallProgress * 0.6)
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(0, 4 * s, 9 * s * (1 + fallProgress * 0.6), 3.2 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // The pin's position (p) already reflects real physics sliding — this just adds the visual
  // topple rotation as it goes down.
  const eased = fallProgress < 1 ? easeOutBack(fallProgress) : 1
  const angle = eased * (Math.PI / 2 + 0.15) * Math.sign(pin.knockDirX || 1)

  ctx.rotate(angle * (pin.state === 'down' || pin.state === 'falling' ? 1 : 0))
  ctx.scale(s * popScale, s * popScale)

  const bodyH = 30
  const bodyW = 11
  const neckW = 5
  const headR = 6.2

  const grad = ctx.createLinearGradient(-bodyW, -bodyH, bodyW, 0)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.5, '#f3f3f3')
  grad.addColorStop(1, '#d9d9e2')
  ctx.fillStyle = grad
  ctx.strokeStyle = '#c9c9d4'
  ctx.lineWidth = 0.6

  ctx.beginPath()
  ctx.moveTo(-bodyW * 0.55, 0)
  ctx.bezierCurveTo(-bodyW, -bodyH * 0.25, -bodyW * 0.85, -bodyH * 0.55, -neckW, -bodyH * 0.72)
  ctx.bezierCurveTo(-neckW * 1.4, -bodyH * 0.8, -headR, -bodyH * 0.86, -headR, -bodyH * 0.92)
  ctx.arc(0, -bodyH * 0.92 - headR * 0.15, headR, Math.PI, 0, false)
  ctx.bezierCurveTo(headR * 1.4, -bodyH * 0.8, neckW * 1.4, -bodyH * 0.8, neckW, -bodyH * 0.72)
  ctx.bezierCurveTo(bodyW * 0.85, -bodyH * 0.55, bodyW, -bodyH * 0.25, bodyW * 0.55, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#d7263d'
  ctx.fillRect(-bodyW * 0.72, -bodyH * 0.5, bodyW * 1.44, 3.4)
  ctx.fillRect(-bodyW * 0.6, -bodyH * 0.62, bodyW * 1.2, 2.6)

  if (fallProgress < 0.9) {
    ctx.fillStyle = '#3a3a3a'
    ctx.globalAlpha = 1 - fallProgress
    ctx.beginPath()
    ctx.arc(-2.1, -bodyH * 0.92 - headR * 0.1, 0.9, 0, Math.PI * 2)
    ctx.arc(2.1, -bodyH * 0.92 - headR * 0.1, 0.9, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, -bodyH * 0.86, 2, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

function drawBall(ctx: CanvasRenderingContext2D, engine: Engine): void {
  const proj = engine.proj
  const ball = engine.ball

  ball.trail.forEach((t) => {
    const p = proj.project(t.x, t.y)
    ctx.save()
    ctx.globalAlpha = t.life * 0.3
    ctx.fillStyle = `hsl(${ball.hue}, 80%, 65%)`
    ctx.beginPath()
    ctx.arc(p.x, p.y, ball.radius * p.scale * 0.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })

  const p = proj.project(ball.x, ball.y)
  const yOffset = ball.inGutter ? 4 * p.scale : 0
  const r = ball.radius * p.scale

  ctx.save()
  ctx.globalAlpha = 0.4
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(p.x, p.y + r * 0.55 + yOffset, r * 0.9, r * 0.32, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.translate(p.x, p.y + yOffset)
  ctx.rotate(ball.rotation % (Math.PI * 2))

  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.15, 0, 0, r)
  grad.addColorStop(0, `hsl(${ball.hue}, 90%, 78%)`)
  grad.addColorStop(0.5, `hsl(${ball.hue}, 85%, 55%)`)
  grad.addColorStop(1, `hsl(${ball.hue}, 80%, 32%)`)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(20,20,30,0.55)'
  const holeR = r * 0.11
  ctx.beginPath()
  ctx.arc(-r * 0.22, -r * 0.35, holeR, 0, Math.PI * 2)
  ctx.arc(r * 0.05, -r * 0.42, holeR, 0, Math.PI * 2)
  ctx.arc(r * 0.32, -r * 0.3, holeR, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawAimGuide(ctx: CanvasRenderingContext2D, engine: Engine, viewH: number, accentColor: string): void {
  if (engine.phase !== 'aiming' || !engine.drag) return
  const drag = computeDrag(engine.drag, viewH)
  const bp = engine.proj.project(engine.ball.x, engine.ball.y)

  ctx.save()
  ctx.strokeStyle = drag.power > 0.75 ? '#ff5d5d' : drag.power > 0.4 ? '#ffd23f' : accentColor
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.arc(bp.x, bp.y, 46, -Math.PI / 2, -Math.PI / 2 + drag.power * Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  if (drag.rawDy < 8) {
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = '600 13px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Pull down & back!', bp.x, bp.y + 70)
    ctx.restore()
    return
  }

  const maxLen = 130
  const dashLen = drag.power * maxLen
  const endX = bp.x + drag.ux * dashLen
  const endY = bp.y + drag.uy * dashLen

  ctx.save()
  ctx.setLineDash([8, 8])
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(bp.x, bp.y)
  ctx.lineTo(endX, endY)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.translate(endX, endY)
  ctx.rotate(Math.atan2(drag.uy, drag.ux))
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(10, 0)
  ctx.lineTo(-6, -6)
  ctx.lineTo(-6, 6)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, engine: Engine): void {
  engine.floatingTexts.forEach((f) => {
    const p = engine.proj.project(f.x, f.y)
    ctx.save()
    ctx.globalAlpha = clamp(f.life / 1.6, 0, 1)
    ctx.fillStyle = f.color
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 4
    ctx.font = `800 ${f.big ? 34 : 22}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.strokeText(f.text, p.x, p.y)
    ctx.fillText(f.text, p.x, p.y)
    ctx.restore()
  })
}

function drawParticles(ctx: CanvasRenderingContext2D, engine: Engine): void {
  engine.particles.forEach((p) => {
    ctx.save()
    ctx.globalAlpha = clamp(p.life, 0, 1)
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = p.color
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
    ctx.restore()
  })
}

function render(ctx: CanvasRenderingContext2D, engine: Engine, viewW: number, viewH: number, accentColor: string): void {
  ctx.clearRect(0, 0, viewW, viewH)

  const bgGlow = ctx.createRadialGradient(engine.proj.centerX, engine.proj.farY, 10, engine.proj.centerX, engine.proj.farY, viewW * 0.5)
  bgGlow.addColorStop(0, 'rgba(255,255,255,0.10)')
  bgGlow.addColorStop(1, 'rgba(255,255,255,0)')

  drawBackground(ctx, engine, viewW, viewH, accentColor)
  drawLane(ctx, engine)
  drawPinDeckEnd(ctx, engine, accentColor)
  drawSideguards(ctx, engine)
  ctx.fillStyle = bgGlow
  ctx.fillRect(0, 0, viewW, viewH)

  // Painter's algorithm: project each pin once, then draw far-to-near so nearer objects (pins
  // closer to the bowler, or the ball) layer on top of farther ones.
  const drawables = engine.pins.map((pin) => {
    const p = engine.proj.project(pin.x, pin.y)
    return { y: pin.y, draw: () => drawPin(ctx, pin, p) }
  })
  drawables.push({ y: engine.ball.y, draw: () => drawBall(ctx, engine) })
  drawables.sort((a, b) => b.y - a.y)
  drawables.forEach((d) => d.draw())

  drawAimGuide(ctx, engine, viewH, accentColor)
  drawFloatingTexts(ctx, engine)
  drawParticles(ctx, engine)
}

// --- Component --------------------------------------------------------------------------------

export function BowlingCanvas({ laneLength, bumpersEnabled, onThrowComplete, onGameComplete }: BowlingCanvasProps) {
  const [containerRef, size] = useMeasuredSize({ width: 0, height: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const sizeRef = useRef(size)

  const onThrowCompleteRef = useRef(onThrowComplete)
  const onGameCompleteRef = useRef(onGameComplete)
  useLayoutEffect(() => {
    onThrowCompleteRef.current = onThrowComplete
    onGameCompleteRef.current = onGameComplete
    sizeRef.current = size
  })

  const { current: theme } = useTheme()
  const accentColorRef = useRef(theme.tokens.accent)
  useLayoutEffect(() => {
    accentColorRef.current = theme.tokens.accent
  })

  // Builds the engine once the container has a real size; only the projection is recomputed on
  // later resizes, since physics runs in lane-space units that don't depend on screen pixels.
  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return
    if (!engineRef.current) {
      // bumpersEnabled only seeds the initial engine here; live toggling is handled below so it
      // isn't a dependency of this effect.
      engineRef.current = createEngine(laneLength, size.width, size.height, bumpersEnabled)
    } else {
      engineRef.current.proj = buildProjection(size.width, size.height, laneLength)
    }
  }, [size.width, size.height, laneLength])

  // Bumpers can be toggled mid-game (sidebar action), so keep the live engine's flag in sync
  // without rebuilding it.
  useEffect(() => {
    if (engineRef.current) engineRef.current.bumpersEnabled = bumpersEnabled
  }, [bumpersEnabled])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function getPos(e: PointerEvent): { x: number; y: number } {
      const rect = canvas!.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    function handlePointerDown(e: PointerEvent): void {
      const engine = engineRef.current
      if (!engine || engine.phase !== 'ready') return
      const pos = getPos(e)
      const bp = engine.proj.project(engine.ball.x, engine.ball.y)
      const dist = Math.hypot(pos.x - bp.x, pos.y - bp.y)
      if (dist < 90) {
        engine.drag = { startX: bp.x, startY: bp.y, curX: pos.x, curY: pos.y }
        engine.phase = 'aiming'
        canvas!.setPointerCapture(e.pointerId)
      }
    }

    function handlePointerMove(e: PointerEvent): void {
      const engine = engineRef.current
      if (!engine?.drag) return
      const pos = getPos(e)
      engine.drag.curX = pos.x
      engine.drag.curY = pos.y
    }

    function releaseThrow(e: PointerEvent): void {
      const engine = engineRef.current
      if (!engine?.drag || engine.phase !== 'aiming') return
      if (canvas!.hasPointerCapture(e.pointerId)) canvas!.releasePointerCapture(e.pointerId)

      const drag = computeDrag(engine.drag, sizeRef.current.height)
      engine.drag = null

      if (drag.power < MIN_LAUNCH_POWER || drag.rawDy < 8) {
        engine.phase = 'ready'
        return
      }

      const speed = drag.power * MAX_SPEED
      const lateralSensitivity = 1.15
      engine.ball.vy = speed * Math.abs(drag.uy)
      engine.ball.vx = speed * drag.ux * lateralSensitivity
      engine.ball.spin = -engine.ball.vx * 0.9
      engine.ball.moving = true

      engine.standingAtThrowStart = engine.pins.filter((p) => p.state === 'standing').length
      engine.phase = 'rolling'
      playThrow()
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', releaseThrow)
    canvas.addEventListener('pointercancel', releaseThrow)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', releaseThrow)
      canvas.removeEventListener('pointercancel', releaseThrow)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    if (size.width <= 0 || size.height <= 0) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(size.width * dpr)
    canvas.height = Math.round(size.height * dpr)
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let lastTime = performance.now()
    let raf = 0
    function frame(now: number): void {
      const dt = Math.min((now - lastTime) / 1000, 0.033)
      lastTime = now
      const engine = engineRef.current
      if (engine) {
        update(engine, dt, size.width, size.height, {
          onThrowComplete: (points) => onThrowCompleteRef.current(points),
          onGameComplete: () => onGameCompleteRef.current(),
        })
        render(ctx!, engine, size.width, size.height, accentColorRef.current)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => cancelAnimationFrame(raf)
  }, [size.width, size.height])

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden rounded-3xl bg-pz-surface shadow-inner ring-1 ring-pz-ring">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
    </div>
  )
}
