import { spanSummary } from './span'
import type { EventDef } from './types'

export const sleep: EventDef = {
  type: 'sleep',
  label: 'Sleep',
  toggles: [],
  // One tap when she falls asleep. While she is asleep the button says "Woke up".
  span: { endLabel: 'Woke up' },
  summary: spanSummary('Sleep', 'Sleeping', 'Slept'),
}
