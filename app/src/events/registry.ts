import { feed } from './feed'
import { outside } from './outside'
import { accident } from './accident'
import { sleep } from './sleep'
import type { EventDef } from './types'

// Order here is the order of the log buttons on the home screen.
export const eventDefs: EventDef[] = [feed, outside, accident, sleep]

// Unknown types (for example from a newer version of the app) still display.
export function defFor(type: string): EventDef {
  return eventDefs.find((d) => d.type === type) ?? { type, label: type, toggles: [], summary: () => type }
}
