import type { EventDef } from './types'

// For anything worth remembering that doesn't deserve its own event type.
// The text itself is the event's `note` field, so `data` stays empty.
export const note: EventDef = {
  type: 'note',
  label: 'Note',
  toggles: [],
  noteRequired: true,
  summary: (_data, e) => e?.note?.trim() || 'Note',
}
