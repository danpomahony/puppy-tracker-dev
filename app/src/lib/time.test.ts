import { describe, expect, it } from 'vitest'
import { ago, dayLabel, duration, toDate } from './time'

const MIN = 60_000
const HOUR = 60 * MIN

describe('toDate', () => {
  it('parses the space-separated dates PocketBase returns', () => {
    expect(toDate('2026-10-06 19:59:06.000Z').toISOString()).toBe('2026-10-06T19:59:06.000Z')
  })

  it('still parses ordinary ISO dates', () => {
    expect(toDate('2026-10-06T19:59:06.000Z').toISOString()).toBe('2026-10-06T19:59:06.000Z')
  })
})

describe('duration', () => {
  it.each([
    [0, 'under a minute'],
    [20_000, 'under a minute'],
    [MIN, '1 min'],
    [45 * MIN, '45 min'],
    [HOUR, '1 h'],
    [80 * MIN, '1 h 20 min'],
    [2 * HOUR, '2 h'],
    [26 * HOUR + 5 * MIN, '26 h 5 min'],
  ])('formats %i ms as "%s"', (ms, text) => {
    expect(duration(ms)).toBe(text)
  })

  it('treats a negative duration as none', () => {
    expect(duration(-5 * MIN)).toBe('under a minute')
  })
})

describe('ago', () => {
  it.each([
    [10_000, 'just now'],
    [5 * MIN, '5 min ago'],
    [2 * HOUR + 22 * MIN, '2 h 22 min ago'],
    [24 * HOUR, '1 day ago'],
    [49 * HOUR, '2 days ago'],
  ])('formats %i ms as "%s"', (ms, text) => {
    expect(ago(ms)).toBe(text)
  })
})

describe('dayLabel', () => {
  const now = new Date(2026, 9, 8, 15, 0).getTime() // Thu 8 Oct 2026, 3 pm local time

  it('says Today for any time earlier the same local day', () => {
    expect(dayLabel(new Date(2026, 9, 8, 0, 5), now)).toBe('Today')
  })

  it('says Yesterday for the day before, even just before midnight', () => {
    expect(dayLabel(new Date(2026, 9, 7, 23, 59), now)).toBe('Yesterday')
  })

  it('names the weekday within the last week', () => {
    expect(dayLabel(new Date(2026, 9, 4, 12, 0), now)).toBe(new Date(2026, 9, 4).toLocaleDateString([], { weekday: 'long' }))
  })

  it('uses a short date after a week', () => {
    expect(dayLabel(new Date(2026, 8, 20, 12, 0), now)).toBe(
      new Date(2026, 8, 20).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }),
    )
  })
})
