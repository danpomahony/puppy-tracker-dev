// PocketBase returns "2026-10-06 19:59:06.000Z". Safari on iPhone can't parse the
// space, so swap it for the "T" that ISO 8601 requires.
export const toDate = (s: string) => new Date(s.replace(' ', 'T'))

export function ago(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000))
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h ${min % 60} min ago`
  const d = Math.floor(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}
