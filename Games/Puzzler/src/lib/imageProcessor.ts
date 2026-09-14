const MAX_LONG_EDGE = 1800

export interface ProcessedImage {
  dataUrl: string
  width: number
  height: number
}

/** Decodes a File and downscales it onto an offscreen canvas, capped at MAX_LONG_EDGE, entirely in memory. */
export async function processImage(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file)

  try {
    const scale = Math.min(1, MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not get a 2D canvas context')
    }
    // JPEG has no alpha channel; without an opaque backdrop, transparent PNG/WebP
    // uploads would have their transparent regions flattened to black on export.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), width, height }
  } finally {
    bitmap.close()
  }
}
