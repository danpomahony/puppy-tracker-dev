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

// A short "time since" for a small tile: "20m ago", "2h 22m ago", "1d 3h ago".
export function agoShort(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000))
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ${min % 60}m ago`
  return `${Math.floor(h / 24)}d ${h % 24}h ago`
}

// How long something lasted, for example "1 h 20 min".
export function duration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000))
  if (min < 1) return 'under a minute'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return min % 60 === 0 ? `${h} h` : `${h} h ${min % 60} min`
}

// The time of day an entry happened, for example "3:05 pm".
export const timeOfDay = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

// The heading for one day of entries: "Today", "Yesterday", "Monday" within the
// last week, then "Mon 28 Sep".
export function dayLabel(d: Date, now: number): string {
  const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0)
  const days = Math.round((startOfDay(now) - startOfDay(d.getTime())) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return d.toLocaleDateString([], { weekday: 'long' })
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
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
