import { useEffect, useRef, useState } from 'react'
import { pb } from './lib/pb'
import { eventDefs, defFor } from './events/registry'
import { missingChoice } from './events/types'
import type { EventDef, EventRecord } from './events/types'
import { ago, dayTime, toDate, useNow } from './lib/time'
import { useEvents } from './lib/useEvents'
import EditSheet from './EditSheet'
import SafetySign from './SafetySign'
import './home.css'

// Pee and tiko count wherever they happened: outside or as an accident.
const toileting = (e: EventRecord) => e.type === 'outside' || e.type === 'accident'

const tiles: { label: string; match: (e: EventRecord) => boolean }[] = [
  { label: 'Fed', match: (e) => e.type === 'feed' },
  { label: 'Outside', match: (e) => e.type === 'outside' },
  { label: 'Pee', match: (e) => toileting(e) && e.data?.pee === true },
  { label: 'Tiko', match: (e) => toileting(e) && e.data?.tiko === true },
  { label: 'Accident', match: (e) => e.type === 'accident' },
]

export default function Home() {
  const { dog, events, lastAccident, loaded, problem, log: logEvent, reload } = useEvents()
  const [picking, setPicking] = useState<EventDef | null>(null)
  const [editing, setEditing] = useState<EventRecord | null>(null)
  const [chosen, setChosen] = useState<Record<string, boolean>>({})
  const now = useNow()
  const hint = picking ? missingChoice(picking, chosen) : ''
  const pickerRef = useRef<HTMLFormElement>(null)

  // When the picker opens, bring it fully into view (like the edit sheet does) so
  // its choices and Save button aren't hidden below the bottom of the screen.
  // When it closes, by Save or Cancel, go back to the top to see the sign and tiles.
  useEffect(() => {
    if (picking) pickerRef.current?.scrollIntoView({ block: 'center' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [picking])

  function log(def: EventDef, data: Record<string, boolean>) {
    setPicking(null)
    void logEvent(def.type, data)
  }

  function tap(def: EventDef) {
    if (def.toggles.length === 0) {
      log(def, {})
      return
    }
    setChosen({})
    setPicking(def)
  }

  return (
    <main>
      <h1>{dog?.name ?? 'Puppy tracker'}</h1>
      {problem && <p className="error">{problem}</p>}
      {loaded && !dog && <p>No dog added yet. Add one in the PocketBase dashboard.</p>}
      {loaded && dog && <SafetySign since={lastAccident && toDate(lastAccident.started_at)} now={now} />}

      <section className="log">
        {eventDefs.map((def) => (
          <button key={def.type} disabled={!dog} onClick={() => tap(def)}>
            {def.label}
          </button>
        ))}
      </section>

      {picking && (
        <form
          className="sheet"
          ref={pickerRef}
          onSubmit={(e) => {
            e.preventDefault()
            // Always send every toggle, so "nothing happened" is saved as false, not missing.
            log(picking, Object.fromEntries(picking.toggles.map((t) => [t.key, !!chosen[t.key]])))
          }}
        >
          <h2>{picking.label}</h2>
          {picking.toggles.map((t) => (
            <label key={t.key} className="check">
              <input
                type="checkbox"
                checked={!!chosen[t.key]}
                onChange={(e) => setChosen({ ...chosen, [t.key]: e.target.checked })}
              />
              {t.label}
            </label>
          ))}
          {hint && <p className="muted">{hint}</p>}
          <button type="submit" disabled={!!hint}>
            Save
          </button>
          <button type="button" className="quiet" onClick={() => setPicking(null)}>
            Cancel
          </button>
        </form>
      )}

      <h2>Time since</h2>
      <dl className="tiles">
        {tiles.map((t) => {
          const hit = events.find(t.match)
          return (
            <div key={t.label}>
              <dt>{t.label}</dt>
              <dd>{hit ? ago(now - toDate(hit.started_at).getTime()) : 'Not yet'}</dd>
            </div>
          )
        })}
      </dl>

      <h2>Recent</h2>
      <ul className="recent">
        {events.slice(0, 8).map((e) => (
          <li key={e.id}>
            <button className="row" onClick={() => setEditing(e)}>
              <span>
                {defFor(e.type).summary(e.data)}
                <small>{e.expand?.logged_by?.name ?? ''}</small>
              </span>
              <time dateTime={e.started_at}>
                {dayTime(toDate(e.started_at), now)}
              </time>
            </button>
          </li>
        ))}
      </ul>

      {editing && <EditSheet key={editing.id} event={editing} onClose={() => setEditing(null)} onSaved={reload} />}

      <p className="muted">Signed in as {pb.authStore.record?.email}</p>
      <button className="quiet" onClick={() => pb.authStore.clear()}>
        Sign out
      </button>
    </main>
  )
}

