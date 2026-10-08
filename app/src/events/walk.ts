import { spanSummary } from './span'
import type { EventDef } from './types'

export const walk: EventDef = {
  type: 'walk',
  label: 'Walk',
  toggles: [],
  // One tap when they leave. While they are out the button says "Back home".
  span: { endLabel: 'Back home' },
  summary: spanSummary('Walk', 'On a walk', 'Walked for'),
}
