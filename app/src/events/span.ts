import { duration, toDate } from '../lib/time'
import type { EventRecord } from './types'

// The summary line for something that lasts a while (sleep, a walk, play):
// the plain label with no entry to look at, `going` while it is still open
// (no end time), and `did` plus how long it took once it has ended.
export function spanSummary(plain: string, going: string, did: string) {
  return (_data: Record<string, unknown> | null, e?: EventRecord): string => {
    if (!e) return plain
    if (!e.ended_at) return going
    return `${did} ${duration(toDate(e.ended_at).getTime() - toDate(e.started_at).getTime())}`
  }
}
