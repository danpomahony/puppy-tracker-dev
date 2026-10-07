import type { EventDef } from './types'

export const feed: EventDef = {
  type: 'feed',
  label: 'Fed',
  toggles: [], // one tap logs it
  summary: () => 'Fed',
}
