import { describe, expect, it } from 'vitest'
import { agreedOf, groupByCategory, statusOf } from './words'
import type { Word } from './words'

const w = (term: string, extra: Partial<Word> = {}): Word => ({ id: term, term, ...extra })

describe('statusOf and agreedOf', () => {
  it('read a saved value', () => {
    expect(statusOf(w('sit', { status: 'knows it' }))).toBe('knows it')
    expect(agreedOf(w('sit', { agreed: 'confirmed' }))).toBe('confirmed')
  })

  it('fall back when the value is missing, empty or unknown', () => {
    expect(statusOf(w('sit'))).toBe('introducing')
    expect(statusOf(w('sit', { status: '' }))).toBe('introducing')
    expect(statusOf(w('sit', { status: 'mastered' }))).toBe('introducing')
    expect(agreedOf(w('sit'))).toBe('proposed')
    expect(agreedOf(w('sit', { agreed: '' }))).toBe('proposed')
  })
})

describe('groupByCategory', () => {
  it('sorts categories and words A to Z, with blank categories last under Other', () => {
    const groups = groupByCategory([
      w('tiko', { category: 'toileting' }),
      w('stay', { category: 'commands' }),
      w('hello'),
      w('sit', { category: 'commands' }),
      w('pee', { category: ' toileting ' }),
      w('hi', { category: '' }),
    ])
    expect(groups.map((g) => g.category)).toEqual(['commands', 'toileting', 'Other'])
    expect(groups[0].words.map((x) => x.term)).toEqual(['sit', 'stay'])
    expect(groups[1].words.map((x) => x.term)).toEqual(['pee', 'tiko'])
    expect(groups[2].words.map((x) => x.term)).toEqual(['hello', 'hi'])
  })

  it('returns nothing for no words', () => {
    expect(groupByCategory([])).toEqual([])
  })
})
