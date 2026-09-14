const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

export type IngestResult = { ok: true; file: File } | { ok: false; message: string }

export function ingestImageFile(file: File): IngestResult {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return { ok: false, message: 'Please choose a JPG, PNG, or WEBP photo.' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, message: 'That photo is too big. Please choose one under 20MB.' }
  }

  return { ok: true, file }
}
