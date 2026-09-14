const STORAGE_KEY = 'wonderplay-bowling-bumpers'

/** Whether the gutter-guard toggle ("sideguards") is on, persisted across sessions. */
export function isBumpersEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setBumpersEnabled(next: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    // localStorage unavailable (private browsing, etc.) — the in-memory setting still applies this session.
  }
}
