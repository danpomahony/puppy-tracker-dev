// The family's shared vocabulary. Every field except `term` is optional in the
// database, and PocketBase returns "" for an empty one, so readers go through
// the helpers below instead of trusting the raw record.

export const STATUSES = ['introducing', 'learning', 'knows it'] as const
export type Status = (typeof STATUSES)[number]

export const AGREEMENTS = ['proposed', 'confirmed'] as const
export type Agreement = (typeof AGREEMENTS)[number]

export interface Word {
  id: string
  term: string
  description?: string
  how_to_say?: string
  why?: string
  category?: string
  agreed?: string
  status?: string
}

// Missing, empty or unrecognised values fall back to the starting point.
export const statusOf = (w: Word): Status => STATUSES.find((s) => s === w.status) ?? 'introducing'
export const agreedOf = (w: Word): Agreement => AGREEMENTS.find((a) => a === w.agreed) ?? 'proposed'

// Words grouped under their category (blank ones under "Other"), categories A to Z
// with "Other" last, and the words inside each group A to Z.
export function groupByCategory(words: Word[]): { category: string; words: Word[] }[] {
  const groups = new Map<string, Word[]>()
  for (const w of words) {
    const key = w.category?.trim() || 'Other'
    groups.set(key, [...(groups.get(key) ?? []), w])
  }
  return [...groups]
    .map(([category, list]) => ({ category, words: list.sort((a, b) => a.term.localeCompare(b.term)) }))
    .sort((a, b) =>
      a.category === 'Other' ? 1 : b.category === 'Other' ? -1 : a.category.localeCompare(b.category),
    )
}
