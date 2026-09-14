import { useEffect, useRef, useState } from 'react'

export interface MeasuredSize {
  width: number
  height: number
}

/** Tracks an element's content-box size via ResizeObserver, for layouts that must fit exactly (no scrolling). */
export function useMeasuredSize(initial: MeasuredSize) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<MeasuredSize>(initial)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, size] as const
}
