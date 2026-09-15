const MAX_LONG_EDGE = 1800

export interface ProcessedImage {
  dataUrl: string
  width: number
  height: number
}

/** Decodes a File and downscales it onto an offscreen canvas, capped at MAX_LONG_EDGE, entirely in memory. */
export async function processImage(file: File): Promise<ProcessedImage> {
  const image = await decodeImage(file)

  // naturalWidth/Height are the *displayed* dimensions, i.e. already rotated to match the
  // photo's EXIF orientation - so a portrait phone photo reports portrait here even though its
  // pixels are stored landscape. Sizing off these (rather than off the raw pixel buffer) is
  // what keeps the puzzle's aspect ratio matching what the player actually sees.
  const sourceWidth = image.naturalWidth
  const sourceHeight = image.naturalHeight
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('Decoded image has no dimensions')
  }

  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))

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
  ctx.drawImage(image, 0, 0, width, height)

  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), width, height }
}

/**
 * Decodes a File through an <img> element rather than createImageBitmap, specifically so the
 * photo comes out the way up it was taken.
 *
 * A tablet or phone camera stores its pixels in the sensor's own fixed orientation and records
 * which way the device was actually held as an EXIF tag alongside them. An <img> honours that
 * tag - CSS image-orientation defaults to `from-image`, and canvas drawImage follows the
 * element's setting - whereas createImageBitmap defaults to ignoring it in Safari. That default
 * is why a perfectly upright iPad photo arrived in the puzzle lying on its side, while the same
 * photo was fine on a desktop browser that happens to default the other way.
 */
function decodeImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    function cleanup() {
      URL.revokeObjectURL(url)
    }

    image.onload = () => {
      cleanup()
      resolve(image)
    }
    image.onerror = () => {
      cleanup()
      reject(new Error('Could not decode the image file'))
    }

    // The initial value, set explicitly: this is the entire reason decoding goes through an
    // element, so it shouldn't be left to look like an accident that it isn't `none`.
    image.style.imageOrientation = 'from-image'
    image.src = url
  })
}
