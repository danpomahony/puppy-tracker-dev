import { toDate, duration } from '../lib/time'
import type { EventDef } from './types'

export const sleep: EventDef = {
  type: 'sleep',
  label: 'Sleep',
  toggles: [],
  // One tap when she falls asleep. While she is asleep the button says "Woke up".
  span: { endLabel: 'Woke up' },
  summary: (_data, e) => {
    if (!e) return 'Sleep'
    if (!e.ended_at) return 'Sleeping'
    return `Slept ${duration(toDate(e.ended_at).getTime() - toDate(e.started_at).getTime())}`
  },
}
