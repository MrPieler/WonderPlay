export interface ThrowMessage {
  text: string
  tone: 'strike' | 'great' | 'nice' | 'ok' | 'miss'
}

const MESSAGES: { min: number; message: ThrowMessage }[] = [
  { min: 10, message: { text: 'STRIKE!', tone: 'strike' } },
  { min: 7, message: { text: 'Great shot!', tone: 'great' } },
  { min: 4, message: { text: 'Nice!', tone: 'nice' } },
  { min: 1, message: { text: 'Good try!', tone: 'ok' } },
  { min: 0, message: { text: 'So close! Try again!', tone: 'miss' } },
]

/** Pins actually knocked down this throw, clamped to a legal 0-10 regardless of how it was counted. */
export function throwPoints(pinsStandingBefore: number, pinsStandingAfter: number): number {
  return Math.max(0, Math.min(10, pinsStandingBefore - pinsStandingAfter))
}

export function messageForPoints(points: number): ThrowMessage {
  const found = MESSAGES.find((entry) => points >= entry.min)
  return (found ?? MESSAGES[MESSAGES.length - 1]).message
}
