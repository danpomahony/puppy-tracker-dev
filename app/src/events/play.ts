import { spanSummary } from './span'
import type { EventDef } from './types'

export const play: EventDef = {
  type: 'play',
  label: 'Play',
  toggles: [],
  // One tap when play starts. While it lasts the button says "Stop play".
  span: { endLabel: 'Stop play' },
  summary: spanSummary('Play', 'Playing', 'Played for'),
}
