import { useEffect, useLayoutEffect, useRef } from 'react'
import { useTheme } from '../../../../shell'
import { useMeasuredSize } from '../../../../shell/hooks/useMeasuredSize'
import { DIFFICULTIES, type Difficulty } from '../lib/difficulty'
import { findNearestSample, generateWirePath, rescaleWirePath, type WirePath } from '../lib/pathGenerator'
import { playBuzz } from '../lib/soundEffects'

interface BuzzWireCanvasProps {
  difficulty: Difficulty
  onBuzz: () => void
  onWin: () => void
}

const WIRE_STROKE_WIDTH = 8
const RING_STROKE_WIDTH = 8

interface RingState {
  x: number
  y: number
  angle: number
  held: boolean
  /** 1 right after a buzz, fading to 0 — drives the ring's red flash. */
  buzzFlash: number
  maxT: number
}

export function BuzzWireCanvas({ difficulty, onBuzz, onWin }: BuzzWireCanvasProps) {
  const [containerRef, size] = useMeasuredSize({ width: 0, height: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const pathRef = useRef<WirePath | null>(null)
  const designSizeRef = useRef<{ width: number; height: number } | null>(null)
  const ringRef = useRef<RingState>({ x: 0, y: 0, angle: 0, held: false, buzzFlash: 0, maxT: 0 })
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const wonRef = useRef(false)

  // Callbacks are read from refs inside the rAF loop so the loop effect below never needs to
  // restart just because a parent re-render passed a new function identity.
  const onBuzzRef = useRef(onBuzz)
  const onWinRef = useRef(onWin)
  useLayoutEffect(() => {
    onBuzzRef.current = onBuzz
    onWinRef.current = onWin
  })

  // The ring is painted in the player's chosen theme colour, read the same way — a ref the draw
  // loop picks up next frame, so switching themes mid-game recolors the ring without restarting
  // the loop or regenerating the level.
  const { current: theme } = useTheme()
  const accentColorRef = useRef(theme.tokens.accent)
  useLayoutEffect(() => {
    accentColorRef.current = theme.tokens.accent
  })

  const config = DIFFICULTIES[difficulty]

  // Generates the level once the container has a real size. If it resizes later (e.g. rotating
  // a tablet), the existing path is rescaled in place rather than regenerated, so an attempt in
  // progress never loses its map.
  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return

    if (!pathRef.current) {
      // The map's shape (length, curves) is the same for every difficulty — only the ring's
      // tolerance below varies, so path generation never depends on `config` here.
      const path = generateWirePath({ width: size.width, height: size.height })
      pathRef.current = path
      designSizeRef.current = { width: size.width, height: size.height }
      ringRef.current = { x: path.start.x, y: path.start.y, angle: path.start.angle, held: false, buzzFlash: 0, maxT: 0 }
      // Dev-only hook so browser-driven smoke tests can read the randomized path instead of
      // guessing coordinates; stripped from production builds since it's behind import.meta.env.DEV.
      if (import.meta.env.DEV) {
        ;(window as unknown as { __buzzWireDebug?: unknown }).__buzzWireDebug = {
          getPath: () => pathRef.current,
          tolerance: config.tolerance,
        }
      }
      return
    }

    const design = designSizeRef.current!
    if (design.width === size.width && design.height === size.height) return

    const scaleX = size.width / design.width
    const scaleY = size.height / design.height
    pathRef.current = rescaleWirePath(pathRef.current, scaleX, scaleY)
    designSizeRef.current = { width: size.width, height: size.height }
    ringRef.current.x *= scaleX
    ringRef.current.y *= scaleY
  }, [size.width, size.height, config])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function getPos(e: PointerEvent): { x: number; y: number } {
      const rect = canvas!.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    function handlePointerDown(e: PointerEvent) {
      if (!pathRef.current || wonRef.current) return
      const pos = getPos(e)
      const ring = ringRef.current
      const grabRadius = Math.max(40, (config.tolerance + RING_STROKE_WIDTH) * 2.4)
      if (Math.hypot(pos.x - ring.x, pos.y - ring.y) <= grabRadius) {
        ring.held = true
        pointerRef.current = pos
        canvas!.setPointerCapture(e.pointerId)
        e.preventDefault()
      }
    }

    function handlePointerMove(e: PointerEvent) {
      if (!ringRef.current.held) return
      pointerRef.current = getPos(e)
    }

    function handlePointerUp(e: PointerEvent) {
      ringRef.current.held = false
      if (canvas!.hasPointerCapture(e.pointerId)) canvas!.releasePointerCapture(e.pointerId)
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [config.tolerance])

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

    function update() {
      const path = pathRef.current
      const ring = ringRef.current
      if (!path) return

      if (ring.buzzFlash > 0) ring.buzzFlash = Math.max(0, ring.buzzFlash - 0.04)
      if (!ring.held || wonRef.current) return

      const pointer = pointerRef.current
      if (!pointer) return

      ring.x = pointer.x
      ring.y = pointer.y

      const nearest = findNearestSample(path, ring.x, ring.y)

      if (nearest.distance > config.tolerance) {
        ring.held = false
        ring.buzzFlash = 1
        ring.x = path.start.x
        ring.y = path.start.y
        ring.angle = path.start.angle
        ring.maxT = 0
        onBuzzRef.current()
        playBuzz()
        return
      }

      ring.angle = nearest.sample.angle
      ring.maxT = Math.max(ring.maxT, nearest.sample.t)

      const distToEnd = Math.hypot(ring.x - path.end.x, ring.y - path.end.y)
      if (distToEnd <= config.tolerance) {
        ring.held = false
        wonRef.current = true
        onWinRef.current()
      }
    }

    function draw(now: number) {
      ctx!.clearRect(0, 0, size.width, size.height)
      const path = pathRef.current
      if (!path) return

      const accentColor = accentColorRef.current
      drawWire(ctx!, path)
      drawPad(ctx!, path.start.x, path.start.y, '#4caf7d', 'START')
      drawPad(ctx!, path.end.x, path.end.y, '#e2894a', 'FINISH')
      drawProgressBar(ctx!, size.width, ringRef.current.maxT, accentColor)
      drawIdleHint(ctx!, ringRef.current, config.tolerance, now, accentColor)
      drawRing(ctx!, ringRef.current, config.tolerance, accentColor)
    }

    let raf = 0
    function frame(now: number) {
      update()
      draw(now)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => cancelAnimationFrame(raf)
  }, [size.width, size.height, config])

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden rounded-3xl bg-pz-surface shadow-inner ring-1 ring-pz-ring">
      <canvas ref={canvasRef} className="block h-full w-full touch-none cursor-grab active:cursor-grabbing" />
    </div>
  )
}

/** Points offset perpendicular to the wire's local tangent, used to paint shading bands that follow the curve exactly rather than a fixed screen-space gradient. */
function offsetPoints(samples: WirePath['samples'], offset: number): { x: number; y: number }[] {
  return samples.map((s) => {
    const nx = Math.cos(s.angle + Math.PI / 2)
    const ny = Math.sin(s.angle + Math.PI / 2)
    return { x: s.x + nx * offset, y: s.y + ny * offset }
  })
}

function strokePolyline(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  style: string,
  width: number,
  alpha = 1,
) {
  if (pts.length < 2) return
  ctx.beginPath()
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.strokeStyle = style
  ctx.lineWidth = width
  ctx.globalAlpha = alpha
  ctx.stroke()
  ctx.globalAlpha = 1
}

function drawWire(ctx: CanvasRenderingContext2D, path: WirePath) {
  const samples = path.samples
  const center = samples.map((s) => ({ x: s.x, y: s.y }))
  const halfWidth = WIRE_STROKE_WIDTH / 2 + 2

  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // Drop shadow lifts the rod off the background.
  strokePolyline(
    ctx,
    center.map((p) => ({ x: p.x + 1.5, y: p.y + 2.5 })),
    'rgba(0,0,0,0.32)',
    WIRE_STROKE_WIDTH + 6,
    0.55,
  )

  // Dark tube outline, then the mid-tone metal body.
  strokePolyline(ctx, center, '#3d2c14', WIRE_STROKE_WIDTH + 4)
  strokePolyline(ctx, center, '#b9832f', WIRE_STROKE_WIDTH + 1)

  // Shaded underside, opposite the highlight, to sell the round cross-section.
  strokePolyline(ctx, offsetPoints(samples, halfWidth * 0.4), '#6e4a1c', WIRE_STROKE_WIDTH * 0.55, 0.8)

  // Warm core highlight band plus a thin bright specular streak near one edge.
  strokePolyline(ctx, offsetPoints(samples, -halfWidth * 0.3), '#ffdd8f', WIRE_STROKE_WIDTH * 0.42, 0.85)
  strokePolyline(ctx, offsetPoints(samples, -halfWidth * 0.48), '#fff6df', WIRE_STROKE_WIDTH * 0.16, 0.95)

  ctx.restore()
}

function drawPad(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, 16, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.globalAlpha = 0.25
  ctx.fill()

  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.arc(x, y, 8, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  ctx.font = 'bold 12px system-ui, sans-serif'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.fillText(label, x, y - 22)
  ctx.restore()
}

function drawProgressBar(ctx: CanvasRenderingContext2D, width: number, progress: number, accentColor: string) {
  const barHeight = 10
  const margin = 16
  const barWidth = width - margin * 2
  if (barWidth <= 0) return

  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  ctx.beginPath()
  ctx.roundRect(margin, margin, barWidth, barHeight, barHeight / 2)
  ctx.fill()

  const filled = Math.max(barHeight, barWidth * progress)
  ctx.fillStyle = accentColor
  ctx.beginPath()
  ctx.roundRect(margin, margin, filled, barHeight, barHeight / 2)
  ctx.fill()
  ctx.restore()
}

function drawIdleHint(ctx: CanvasRenderingContext2D, ring: RingState, tolerance: number, now: number, accentColor: string) {
  if (ring.held || ring.maxT > 0) return
  const pulse = 0.5 + 0.5 * Math.sin(now / 300)
  ctx.save()
  ctx.beginPath()
  ctx.arc(ring.x, ring.y, tolerance + 10 + pulse * 6, 0, Math.PI * 2)
  ctx.strokeStyle = accentColor
  ctx.globalAlpha = 0.35 + 0.25 * pulse
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()
}

function drawRing(ctx: CanvasRenderingContext2D, ring: RingState, tolerance: number, accentColor: string) {
  // The ellipse's short axis stays aligned to the wire's local tangent, so the ring reads as a
  // loop foreshortened by the wire's own direction — the "orientation" the ring follows.
  const radiusPerp = tolerance + RING_STROKE_WIDTH / 2
  const radiusAlong = radiusPerp * 0.42
  const bodyWidth = RING_STROKE_WIDTH + 2
  const flashing = ring.buzzFlash > 0
  const bodyColor = flashing ? '#dc3c3c' : accentColor
  const bodyAlpha = flashing ? 0.6 + 0.4 * ring.buzzFlash : 1

  ctx.save()
  ctx.translate(ring.x, ring.y)

  // Drop shadow, cast straight down in screen space regardless of the ring's own rotation.
  ctx.save()
  ctx.rotate(ring.angle)
  ctx.beginPath()
  ctx.ellipse(1.5, 2.5, radiusAlong, radiusPerp, 0, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = bodyWidth
  ctx.stroke()
  ctx.restore()

  ctx.rotate(ring.angle)

  // Dark rim gives the band a defined edge, like a bevel, before the coloured body goes on top.
  ctx.beginPath()
  ctx.ellipse(0, 0, radiusAlong, radiusPerp, 0, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.lineWidth = bodyWidth + 2.5
  ctx.globalAlpha = bodyAlpha
  ctx.stroke()

  // Theme-coloured metal body.
  ctx.beginPath()
  ctx.ellipse(0, 0, radiusAlong, radiusPerp, 0, 0, Math.PI * 2)
  ctx.strokeStyle = bodyColor
  ctx.lineWidth = bodyWidth
  ctx.stroke()

  // Light/dark banding overlay fakes the rounded cross-section of a metal torus without needing
  // to know the accent colour's format — it's a translucent black/white sheen layered on top.
  const sheen = ctx.createLinearGradient(0, -radiusPerp, 0, radiusPerp)
  sheen.addColorStop(0, 'rgba(255,255,255,0.75)')
  sheen.addColorStop(0.22, 'rgba(255,255,255,0.12)')
  sheen.addColorStop(0.45, 'rgba(0,0,0,0.28)')
  sheen.addColorStop(0.65, 'rgba(255,255,255,0.1)')
  sheen.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.beginPath()
  ctx.ellipse(0, 0, radiusAlong, radiusPerp, 0, 0, Math.PI * 2)
  ctx.strokeStyle = sheen
  ctx.lineWidth = bodyWidth
  ctx.stroke()
  ctx.globalAlpha = 1

  // Crisp specular glint, the kind of sharp highlight only polished metal shows.
  ctx.beginPath()
  ctx.ellipse(0, 0, radiusAlong, radiusPerp, 0, -Math.PI * 0.85, -Math.PI * 0.25)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = bodyWidth * 0.28
  ctx.lineCap = 'round'
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(0, radiusPerp * 0.62, 2.2, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.8
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.restore()
}
