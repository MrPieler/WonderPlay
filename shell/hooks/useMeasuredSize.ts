import { useEffect, useRef, useState } from 'react'

export interface MeasuredSize {
  width: number
  height: number
}

/**
 * Tracks an element's content-box size via ResizeObserver, for layouts that must fit exactly (no scrolling).
 *
 * Measurements are rounded to whole pixels and coalesced into a single animation frame before
 * they reach React. Rotating a tablet doesn't produce one resize, it produces a burst of them as
 * the viewport animates round, and everything sized from this hook (a puzzle board and its whole
 * tray of pieces, a canvas backing store) is far too expensive to rebuild once per callback -
 * that burst is what made a rotation land in visible steps instead of settling smoothly.
 * Rounding matters for the same reason: sub-pixel jitter is not a size change worth re-laying
 * out for, but it looks like one to an equality check.
 */
export function useMeasuredSize(initial: MeasuredSize) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<MeasuredSize>(initial)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let frame = 0
    let pending: MeasuredSize | null = null

    function flush() {
      frame = 0
      const next = pending
      pending = null
      if (!next) return
      setSize((previous) => (previous.width === next.width && previous.height === next.height ? previous : next))
    }

    const observer = new ResizeObserver((entries) => {
      // Only the last entry matters: they're all the same element, and anything earlier in the
      // batch is already stale by the time this runs.
      const entry = entries[entries.length - 1]
      if (!entry) return
      pending = { width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) }
      if (!frame) frame = requestAnimationFrame(flush)
    })
    observer.observe(el)

    /*
     * Safety net for orientation changes. iOS Safari can finish rotating without the observer
     * ever reporting the settled size - it reports a mid-rotation box and then goes quiet, which
     * leaves a canvas or board sized for the orientation you just left. Re-observing forces a
     * fresh observation of the element's true content box (observe() always delivers one), which
     * the flush above then de-duplicates if nothing actually moved.
     */
    function remeasure() {
      observer.unobserve(el!)
      observer.observe(el!)
    }
    window.addEventListener('orientationchange', remeasure)
    window.addEventListener('resize', remeasure)

    return () => {
      window.removeEventListener('orientationchange', remeasure)
      window.removeEventListener('resize', remeasure)
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return [ref, size] as const
}
