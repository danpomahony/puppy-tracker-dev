import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { pb } from './lib/pb'
import { AGREEMENTS, STATUSES, agreedOf, statusOf } from './lib/words'
import type { Word } from './lib/words'
import './edit.css'

interface Props {
  word: Word | null // null means adding a new word
  onClose: () => void
  onSaved: () => void
}

// The form for adding a word or editing one. It has the same look as the edit
// sheet on History (the .sheet class), and the same two-step delete.
export default function WordSheet({ word, onClose, onSaved }: Props) {
  const ref = useRef<HTMLFormElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)
  const [term, setTerm] = useState(word?.term ?? '')
  const [description, setDescription] = useState(word?.description ?? '')
  const [howToSay, setHowToSay] = useState(word?.how_to_say ?? '')
  const [why, setWhy] = useState(word?.why ?? '')
  const [category, setCategory] = useState(word?.category ?? '')
  const [agreed, setAgreed] = useState(word ? agreedOf(word) : 'proposed')
  const [status, setStatus] = useState(word ? statusOf(word) : 'introducing')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  // Bring the sheet into view when it opens. When the delete confirmation opens, bring
  // that into view instead: the sheet is tall, so centring all of it would leave the
  // buttons below the screen.
  useEffect(() => {
    const target = confirming ? confirmRef.current : ref.current
    target?.scrollIntoView({ block: 'center' })
  }, [confirming])

  async function save(e: FormEvent) {
    e.preventDefault()
    const fields = {
      term: term.trim(),
      description: description.trim(),
      how_to_say: howToSay.trim(),
      why: why.trim(),
      category: category.trim(),
      agreed,
      status,
    }
    try {
      if (word) await pb.collection('words').update(word.id, fields)
      else await pb.collection('words').create(fields)
      onSaved()
      onClose()
    } catch {
      setError("Couldn't save the word. Check the connection and try again.")
    }
  }

  async function remove() {
    if (!word) return
    try {
      await pb.collection('words').delete(word.id)
      onSaved()
      onClose()
    } catch {
      setError("Couldn't delete the word. Check the connection and try again.")
      setConfirming(false)
    }
  }

  return (
    <form className="sheet" ref={ref} onSubmit={save}>
      <h2>{word ? 'Edit word' : 'Add a word'}</h2>
      <label>
        Word
        <input value={term} maxLength={60} onChange={(e) => setTerm(e.target.value)} required />
      </label>
      <label>
        What it means (optional)
        <textarea rows={2} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label>
        How to say it (optional)
        <input value={howToSay} maxLength={200} placeholder="Tone, hand signal" onChange={(e) => setHowToSay(e.target.value)} />
      </label>
      <label>
        Why we chose it (optional)
        <input value={why} maxLength={200} onChange={(e) => setWhy(e.target.value)} />
      </label>
      <label>
        Category (optional)
        <input value={category} maxLength={40} placeholder="Toileting, commands, manners" onChange={(e) => setCategory(e.target.value)} />
      </label>
      <label>
        Agreed
        <select value={agreed} onChange={(e) => setAgreed(e.target.value as typeof agreed)}>
          {AGREEMENTS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </label>
      <label>
        How well she knows it
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={!term.trim()}>
        {word ? 'Save changes' : 'Add word'}
      </button>
      <button type="button" className="quiet" onClick={onClose}>
        Cancel
      </button>
      {word &&
        (confirming ? (
          <div className="confirm" ref={confirmRef} role="alertdialog" aria-label="Confirm delete">
            <p>Delete “{word.term}”?</p>
            <p className="muted">This can't be undone.</p>
            <button type="button" className="danger solid" onClick={remove}>
              Yes, delete it
            </button>
            {/* Focus starts on the safe choice, so a stray tap or Enter keeps the word. */}
            <button type="button" className="quiet" autoFocus onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
        ) : (
          <button type="button" className="danger" onClick={() => setConfirming(true)}>
            Delete word
          </button>
        ))}
    </form>
  )
}
