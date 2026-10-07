import { outcome } from './types'
import type { EventDef } from './types'

export const outside: EventDef = {
  type: 'outside',
  label: 'Outside',
  toggles: [
    { key: 'pee', label: 'Peed' },
    { key: 'tiko', label: 'Tiko' },
  ],
  summary: (data) => `Outside: ${outcome(data)}`,
}
