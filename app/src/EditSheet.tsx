import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { pb } from './lib/pb'
import { defFor } from './events/registry'
import { toDate } from './lib/time'
import { missingChoice } from './events/types'
import type { EventRecord } from './events/types'
import './edit.css'

// <input type="datetime-local"> wants local time as "YYYY-MM-DDTHH:mm".
const toLocalInput = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

interface Props {
  event: EventRecord
  onClose: () => void
  onSaved: () => void
}

export default function EditSheet({ event, onClose, onSaved }: Props) {
  const def = defFor(event.type)
  const ref = useRef<HTMLFormElement>(null)
  const [when, setWhen] = useState(toLocalInput(toDate(event.started_at)))
  const [until, setUntil] = useState(event.ended_at ? toLocalInput(toDate(event.ended_at)) : '')
  const [flags, setFlags] = useState<Record<string, boolean>>(
    Object.fromEntries(def.toggles.map((t) => [t.key, event.data?.[t.key] === true])),
  )
  const [error, setError] = useState('')
  const hint = missingChoice(def, flags)

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center' })
  }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    if (def.span && until && new Date(until) < new Date(when)) {
      setError('The end time is before the start time. Check both times and try again.')
      return
    }
    try {
      await pb.collection('events').update(event.id, {
        started_at: new Date(when).toISOString(),
        // Only events that last a while have an end time. Empty means still going.
        ...(def.span ? { ended_at: until ? new Date(until).toISOString() : '' } : {}),
        data: { ...event.data, ...flags }, // keeps any fields this version doesn't know about
      })
      onSaved()
      onClose()
    } catch {
      setError("Couldn't save the changes. Check the connection and try again.")
    }
  }

  async function remove() {
    if (!window.confirm('Delete this entry?')) return
    try {
      await pb.collection('events').delete(event.id)
      onSaved()
      onClose()
    } catch {
      setError("Couldn't delete the entry. Check the connection and try again.")
    }
  }

  return (
    <form className="sheet" ref={ref} onSubmit={save}>
      <h2>Edit: {def.label}</h2>
      <label>
        When
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
      </label>
      {def.span && (
        <label>
          Ended (leave empty if it is still going)
          <input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
        </label>
      )}
      {def.toggles.map((t) => (
        <label key={t.key} className="check">
          <input
            type="checkbox"
            checked={!!flags[t.key]}
            onChange={(e) => setFlags({ ...flags, [t.key]: e.target.checked })}
          />
          {t.label}
        </label>
      ))}
      {hint && <p className="muted">{hint}</p>}
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={!!hint}>
        Save changes
      </button>
      <button type="button" className="quiet" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="danger" onClick={remove}>
        Delete entry
      </button>
    </form>
  )
}
