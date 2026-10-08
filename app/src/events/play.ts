import { spanSummary } from './span'
import type { EventDef } from './types'

export const play: EventDef = {
  type: 'play',
  label: 'Play',
  toggles: [],
  // One tap when play starts. While it lasts the button says "Done".
  span: { endLabel: 'Done' },
  summary: spanSummary('Play', 'Playing', 'Played for'),
}
