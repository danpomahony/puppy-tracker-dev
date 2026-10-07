import { outcome } from './types'
import type { EventDef } from './types'

export const accident: EventDef = {
  type: 'accident',
  label: 'Accident',
  toggles: [
    { key: 'pee', label: 'Pee' },
    { key: 'tiko', label: 'Tiko' },
  ],
  summary: (data) => `Accident: ${outcome(data)}`,
}
