import { describe, expect, it } from 'vitest'
import { accident } from './accident'
import { outside } from './outside'
import { defFor, eventDefs } from './registry'
import { note } from './note'
import { isOpen, missingChoice, missingNote, newId, outcome } from './types'
import type { EventRecord } from './types'

describe('outcome', () => {
  it.each([
    [{ pee: true, tiko: true }, 'pee and tiko'],
    [{ pee: true, tiko: false }, 'pee'],
    [{ tiko: true }, 'tiko'],
    [{ pee: false, tiko: false }, 'nothing'],
    [{}, 'nothing'],
    [null, 'nothing'],
  ])('describes %j as "%s"', (data, text) => {
    expect(outcome(data)).toBe(text)
  })
})

describe('missingChoice', () => {
  it('asks for a choice when an accident has nothing ticked', () => {
    expect(missingChoice(accident, {})).toBe('Choose pee, tiko or both.')
  })

  it('is satisfied once one toggle is ticked', () => {
    expect(missingChoice(accident, { pee: true })).toBe('')
  })

  it('never blocks an event that allows nothing ticked', () => {
    expect(missingChoice(outside, {})).toBe('')
  })
})

describe('newId', () => {
  it('is 15 characters of a-z and 0-9, the format PocketBase accepts', () => {
    for (let i = 0; i < 50; i++) expect(newId()).toMatch(/^[a-z0-9]{15}$/)
  })

  it('does not repeat', () => {
    expect(new Set(Array.from({ length: 1000 }, newId)).size).toBe(1000)
  })
})

describe('isOpen', () => {
  const base = { id: 'x', dog: 'd', type: 'sleep', started_at: '2026-10-08 01:00:00.000Z', logged_by: 'u', data: {}, v: 1 }

  it.each([[undefined], [''], [null as unknown as string]])('treats %j as still going', (ended_at) => {
    expect(isOpen({ ...base, ended_at } as EventRecord)).toBe(true)
  })

  it('treats a real end time as finished', () => {
    expect(isOpen({ ...base, ended_at: '2026-10-08 03:00:00.000Z' })).toBe(false)
  })
})

describe('registry', () => {
  it('has one definition per type', () => {
    const types = eventDefs.map((d) => d.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('falls back to a generic definition for an unknown type', () => {
    expect(defFor('from-a-newer-app').summary(null)).toBe('from-a-newer-app')
  })
})

describe('note events', () => {
  const entry = { id: 'x', dog: 'd', type: 'note', started_at: '2026-10-08 01:00:00.000Z', logged_by: 'u', data: {}, v: 1 }

  it('shows the note text as the entry', () => {
    expect(note.summary({}, { ...entry, note: '  dragged her bum on the ground ' })).toBe('dragged her bum on the ground')
  })

  it('falls back to a plain label when the text is missing or empty', () => {
    expect(note.summary({}, { ...entry, note: '' })).toBe('Note')
    expect(note.summary({})).toBe('Note')
  })

  it('cannot be saved empty or with only spaces', () => {
    expect(missingNote(note, '')).toBe('Write a note before saving.')
    expect(missingNote(note, '   ')).toBe('Write a note before saving.')
    expect(missingNote(note, 'ok')).toBe('')
  })

  it('does not require a note on other events', () => {
    expect(missingNote(outside, '')).toBe('')
  })
})
