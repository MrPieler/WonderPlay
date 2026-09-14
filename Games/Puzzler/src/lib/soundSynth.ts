const CHIME_NOTES_HZ = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

/** Plays a short ascending-arpeggio chime using the Web Audio API. No bundled audio assets. */
export function playCompletionChime(): void {
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioContextClass()
  const noteDuration = 0.16

  CHIME_NOTES_HZ.forEach((freq, i) => {
    const startTime = ctx.currentTime + i * noteDuration
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = 'triangle'
    oscillator.frequency.value = freq

    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration)

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.start(startTime)
    oscillator.stop(startTime + noteDuration)
  })

  const totalDuration = CHIME_NOTES_HZ.length * noteDuration
  setTimeout(() => ctx.close(), totalDuration * 1000 + 100)
}
