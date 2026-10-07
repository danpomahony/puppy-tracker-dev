import { useSyncExternalStore } from 'react'

// PocketBase returns "2026-10-06 19:59:06.000Z". Safari on iPhone can't parse the
// space, so swap it for the "T" that ISO 8601 requires.
export const toDate = (s: string) => new Date(s.replace(' ', 'T'))

// The current time as an ISO string, for stamping new entries.
export const nowIso = () => new Date().toISOString()

export function ago(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000))
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h ${min % 60} min ago`
  const d = Math.floor(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

// Re-renders the component every `ms` milliseconds with the current time.
// The clock is an external system, so useSyncExternalStore is the idiomatic way
// to read it. The snapshot is rounded to the interval so it stays stable between ticks.
export function useNow(ms = 30_000): number {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, ms)
      return () => clearInterval(id)
    },
    () => Math.floor(Date.now() / ms) * ms,
  )
}
