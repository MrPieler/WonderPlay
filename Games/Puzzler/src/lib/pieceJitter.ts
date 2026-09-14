/** Deterministic per-piece "physical pile" look: same pieceId+shuffleNonce always yields the same jitter. */
export interface PieceJitter {
  rotateDeg: number
  dx: number
  dy: number
}

function hashToUnitFloat(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/** dx/dy are fractions of the piece's cell size (e.g. -0.18..0.18), meant to be scaled by the caller. */
export function getPieceJitter(pieceId: string, shuffleNonce: number): PieceJitter {
  const seed = `${pieceId}:${shuffleNonce}`
  return {
    rotateDeg: (hashToUnitFloat(seed + ':r') - 0.5) * 30,
    dx: (hashToUnitFloat(seed + ':x') - 0.5) * 0.36,
    dy: (hashToUnitFloat(seed + ':y') - 0.5) * 0.36,
  }
}
