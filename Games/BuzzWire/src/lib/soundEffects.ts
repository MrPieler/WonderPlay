type AudioContextCtor = typeof AudioContext

function getAudioContextClass(): AudioContextCtor {
  return window.AudioContext ?? (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext
}

// Reused across the whole play session (rather than one-per-call, like a single completion chime
// would use) since a buzz can fire many times in quick succession — recreating an AudioContext
// that often adds latency and can hit the browser's concurrent-context limit.
let sharedContext: AudioContext | null = null

function getContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new (getAudioContextClass())()
  }
  if (sharedContext.state === 'suspended') {
    void sharedContext.resume()
  }
  return sharedContext
}

/**
 * A short, soft double-tone buzz for touching the wire — two close square-wave frequencies for a
 * "buzzy" texture, lowpass-filtered and kept quiet/brief so it reads as a friendly "oops" rather
 * than an alarm.
 */
export function playBuzz(): void {
  const ctx = getContext()
  const start = ctx.currentTime
  const duration = 0.16

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 900
  filter.connect(ctx.destination)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(0.18, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  gain.connect(filter)

  for (const freq of [180, 187]) {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = freq
    osc.connect(gain)
    osc.start(start)
    osc.stop(start + duration)
  }
}

const WIN_NOTES_HZ = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

/** A short ascending chime for reaching the end of the wire. */
export function playWinChime(): void {
  const ctx = getContext()
  const noteDuration = 0.15

  WIN_NOTES_HZ.forEach((freq, i) => {
    const startTime = ctx.currentTime + i * noteDuration
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.value = freq

    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(startTime)
    osc.stop(startTime + noteDuration)
  })
}
