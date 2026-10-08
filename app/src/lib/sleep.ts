import { isOpen } from '../events/types'
import type { EventRecord } from '../events/types'
import { toDate } from './time'

// The sleep "day" starts at this hour, local time. Roughly when she wakes up for
// the day, so a night's sleep stays in one piece. Becomes a setting later (#53).
export const DAY_STARTS_AT = 5

// When the sleep day containing time `t` began. Before 5am still belongs to the day before.
export function dayStart(t: number): number {
  const d = new Date(t)
  d.setHours(DAY_STARTS_AT, 0, 0, 0)
  if (d.getTime() > t) d.setDate(d.getDate() - 1)
  return d.getTime()
}

// Added a day at a time with setDate, not 24 hours, so clock changes don't shift it.
export function nextDayStart(start: number): number {
  const d = new Date(start)
  d.setDate(d.getDate() + 1)
  return d.getTime()
}

// Milliseconds slept in each sleep day, keyed by when that day started. A sleep counts
// in full toward the day it starts in, even if it runs past the cutoff, and one that
// is still going counts up to `now`.
export function sleepByDay(events: EventRecord[], now: number): Map<number, number> {
  const totals = new Map<number, number>()
  for (const e of events) {
    if (e.type !== 'sleep') continue
    const start = toDate(e.started_at).getTime()
    const end = isOpen(e) ? now : toDate(e.ended_at!).getTime()
    const day = dayStart(start)
    totals.set(day, (totals.get(day) ?? 0) + Math.max(0, end - start))
  }
  return totals
}

// Whether she is asleep now, and since when. `since` is null if nothing is logged yet.
// Events arrive newest first, so the first sleep is the latest.
export function sleepStatus(events: EventRecord[]): { asleep: boolean; since: number | null } {
  const last = events.find((e) => e.type === 'sleep')
  if (!last) return { asleep: false, since: null }
  if (isOpen(last)) return { asleep: true, since: toDate(last.started_at).getTime() }
  return { asleep: false, since: toDate(last.ended_at!).getTime() }
}
