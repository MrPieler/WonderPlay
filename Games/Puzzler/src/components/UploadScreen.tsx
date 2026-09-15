import { useRef, useState } from 'react'
import { ingestImageFile } from '../lib/imageIngest'
import { processImage } from '../lib/imageProcessor'

interface UploadScreenProps {
  error: string | null
  onImageReady: (image: Awaited<ReturnType<typeof processImage>>) => void
  onError: (message: string) => void
}

export function UploadScreen({ error, onImageReady, onError }: UploadScreenProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const result = ingestImageFile(file)
    if (!result.ok) {
      onError(result.message)
      return
    }

    setIsProcessing(true)
    try {
      const image = await processImage(result.file)
      onImageReady(image)
    } catch {
      onError("That photo couldn't be opened. Please try a different one.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain">
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-4 text-center sm:gap-6 sm:p-6">
        <h1 className="text-3xl font-bold text-pz-ink drop-shadow-sm sm:text-4xl">Puzzler</h1>
        <p className="max-w-md text-sm text-pz-ink-soft sm:text-base">
          Turn one of your own photos into a jigsaw puzzle. Your photo never leaves your own device, so don't worry!
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) void handleFile(file)
          }}
          className={`flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border-4 border-dashed p-6 transition-colors sm:p-10 ${
            isDragOver ? 'border-pz-accent bg-pz-accent-soft' : 'border-pz-ring bg-pz-surface/90'
          }`}
        >
          <p className="text-pz-ink-soft">Drag a photo here, or pick one below</p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-pz-accent px-6 py-3 font-semibold text-pz-accent-ink shadow transition hover:bg-pz-accent-strong active:scale-95 disabled:opacity-50"
            >
              Choose a photo
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => cameraInputRef.current?.click()}
              className="rounded-full bg-pz-surface px-6 py-3 font-semibold text-pz-ink shadow ring-1 ring-pz-ring transition hover:bg-pz-surface-soft active:scale-95 disabled:opacity-50"
            >
              Take a photo
            </button>
          </div>

          {isProcessing && <p className="text-pz-ink-faint">Loading your photo…</p>}
          {error && <p className="rounded-full bg-rose-600 px-4 py-1.5 font-medium text-white">{error}</p>}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleFile(file)
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleFile(file)
          }}
        />
      </div>
    </div>
  )
}
