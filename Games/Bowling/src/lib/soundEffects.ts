type AudioContextCtor = typeof AudioContext

function getAudioContextClass(): AudioContextCtor {
  return window.AudioContext ?? (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext
}

// Reused across the whole play session rather than one-per-call — a strike fires several hits in
// quick succession, and recreating an AudioContext that often adds latency and can hit the
// browser's concurrent-context limit.
let sharedContext: AudioContext | null = null
let muted = false

function getContext(): AudioContext {
  if (!sharedContext) sharedContext = new (getAudioContextClass())()
  if (sharedContext.state === 'suspended') void sharedContext.resume()
  return sharedContext
}

export function setSoundMuted(next: boolean): void {
  muted = next
}

export function isSoundMuted(): boolean {
  return muted
}

function tone(freq: number, duration: number, type: OscillatorType, peakGain: number, startDelay = 0, glideTo?: number): void {
  if (muted) return
  const ctx = getContext()
  const start = ctx.currentTime + startDelay
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

/** A short burst of filtered noise for a pin (or several, in a chain) getting knocked over. */
function noiseHit(duration: number, peakGain: number, startDelay = 0): void {
  if (muted) return
  const ctx = getContext()
  const start = ctx.currentTime + startDelay
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)

  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 1200
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(peakGain, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start(start)
}

export function playThrow(): void {
  tone(180, 0.15, 'sine', 0.15, 0, 260)
}

export function playPinHit(delay = 0): void {
  noiseHit(0.18, 0.35, delay)
}

export function playStrike(): void {
  ;[523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.28, 'triangle', 0.18, i * 0.09))
}

export function playGutter(): void {
  tone(120, 0.4, 'sawtooth', 0.08, 0, 60)
}

export function playPopup(): void {
  tone(880, 0.12, 'sine', 0.1)
}
