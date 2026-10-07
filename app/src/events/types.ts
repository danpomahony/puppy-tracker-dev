export interface EventRecord {
  id: string
  dog: string
  type: string
  started_at: string
  ended_at?: string
  logged_by: string
  note?: string
  data: Record<string, unknown> | null
  v: number
  expand?: { logged_by?: { name?: string } }
}

// Everything the app needs to know about one kind of event.
// Adding a new event type means adding one module that exports one of these.
export interface EventDef {
  type: string
  label: string // button text
  toggles: { key: string; label: string }[] // yes/no details; none = log instantly
  atLeastOne?: boolean // at least one toggle must be ticked before saving
  summary: (data: Record<string, unknown> | null) => string
}

// 15 characters, a-z0-9: the id format PocketBase accepts. Generated on the
// phone so an entry keeps the same id however many times it is sent.
export function newId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(15))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

export function outcome(data: Record<string, unknown> | null): string {
  const parts: string[] = []
  if (data?.pee) parts.push('pee')
  if (data?.tiko) parts.push('tiko')
  return parts.length ? parts.join(' and ') : 'nothing'
}

// The hint shown while an atLeastOne event has nothing ticked, e.g. "Choose pee, tiko or both."
export function missingChoice(def: EventDef, chosen: Record<string, boolean>): string {
  if (!def.atLeastOne || def.toggles.some((t) => chosen[t.key])) return ''
  const names = def.toggles.map((t) => t.label.toLowerCase())
  return `Choose ${names.length === 2 ? `${names[0]}, ${names[1]} or both` : names.join(' or ')}.`
}
