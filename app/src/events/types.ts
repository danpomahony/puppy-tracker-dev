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
}

// Everything the app needs to know about one kind of event.
// Adding a new event type means adding one module that exports one of these.
export interface EventDef {
  type: string
  label: string // button text
  toggles: { key: string; label: string }[] // yes/no details; none = log instantly
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
