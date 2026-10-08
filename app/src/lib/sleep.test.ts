import { describe, expect, it } from 'vitest'
import type { EventRecord } from '../events/types'
import { dayStart, DAY_STARTS_AT, nextDayStart, sleepByDay, sleepStatus } from './sleep'

// Times are written as local time ("2026-10-07T22:00"), so the expectations hold in any timezone.
const local = (s: string) => new Date(s).getTime()
const sleep = (from: string, to: string): EventRecord => ({
  id: 'x',
  dog: 'd',
  type: 'sleep',
  started_at: new Date(from).toISOString(),
  ended_at: to ? new Date(to).toISOString() : '', // PocketBase sends "" for an empty date
  logged_by: 'u',
  data: {},
  v: 1,
})
const hours = (ms: number | undefined) => (ms === undefined ? undefined : Math.round((ms / 3_600_000) * 100) / 100)

describe('dayStart', () => {
  it('puts times before the cutoff in the day before', () => {
    expect(dayStart(local('2026-10-08T04:59'))).toBe(local('2026-10-07T05:00'))
  })

  it('starts a new day exactly at the cutoff', () => {
    expect(dayStart(local('2026-10-08T05:00'))).toBe(local('2026-10-08T05:00'))
  })

  it('uses the cutoff hour as local time on every day of a year, clock changes included', () => {
    for (let day = new Date(2026, 0, 1, 12); day.getFullYear() === 2026; day.setDate(day.getDate() + 1)) {
      const start = new Date(dayStart(day.getTime()))
      expect(start.getHours()).toBe(DAY_STARTS_AT)
      expect(new Date(nextDayStart(start.getTime())).getHours()).toBe(DAY_STARTS_AT)
    }
  })
})

describe('sleepByDay', () => {
  const events = [
    sleep('2026-10-08T08:00', '2026-10-08T09:00'), // a nap on Oct 8
    sleep('2026-10-08T02:20', '2026-10-08T07:00'), // back to sleep after a pee trip, running past 5:00
    sleep('2026-10-07T22:00', '2026-10-08T02:00'), // the night
    sleep('2026-10-07T13:00', '2026-10-07T14:30'), // an afternoon nap
  ]
  const totals = sleepByDay(events, local('2026-10-08T10:00'))

  it('counts a night with a pee trip as one day, even past the cutoff', () => {
    expect(hours(totals.get(local('2026-10-07T05:00')))).toBe(4 + 4.67 + 1.5)
  })

  it('counts a nap after the cutoff in the new day', () => {
    expect(hours(totals.get(local('2026-10-08T05:00')))).toBe(1)
  })

  it('counts a sleep that is still going up to now', () => {
    const open = sleepByDay([sleep('2026-10-08T09:30', '')], local('2026-10-08T10:00'))
    expect(hours(open.get(local('2026-10-08T05:00')))).toBe(0.5)
  })

  it('never counts negative time when an end is before its start', () => {
    const odd = sleepByDay([sleep('2026-10-08T09:00', '2026-10-08T08:00')], local('2026-10-08T10:00'))
    expect(odd.get(local('2026-10-08T05:00'))).toBe(0)
  })

  it('ignores other event types', () => {
    const feed: EventRecord = { ...sleep('2026-10-08T08:00', '2026-10-08T09:00'), type: 'feed' }
    expect(sleepByDay([feed], local('2026-10-08T10:00')).size).toBe(0)
  })
})

describe('sleepStatus', () => {
  const finished = sleep('2026-10-08T01:00', '2026-10-08T03:00')

  it('is awake since the last wake-up', () => {
    expect(sleepStatus([finished])).toEqual({ asleep: false, since: local('2026-10-08T03:00') })
  })

  it('is asleep since the start of an open sleep', () => {
    expect(sleepStatus([sleep('2026-10-08T09:30', ''), finished])).toEqual({ asleep: true, since: local('2026-10-08T09:30') })
  })

  it('has no time when nothing is logged', () => {
    expect(sleepStatus([])).toEqual({ asleep: false, since: null })
  })
})
