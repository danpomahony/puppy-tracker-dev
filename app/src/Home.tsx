import { useEffect, useRef, useState } from 'react'
import { eventDefs } from './events/registry'
import { missingChoice } from './events/types'
import type { EventDef, EventRecord } from './events/types'
import { pb } from './lib/pb'
import { ago, toDate, useNow } from './lib/time'
import type { Dog } from './lib/useEvents'
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

interface Props {
  dog: Dog | null
  events: EventRecord[]
  lastAccident: EventRecord | null
  loaded: boolean
  log: (type: string, data: Record<string, unknown>) => Promise<void>
}

// The Log tab: the safety sign, the log buttons and the "time since" tiles.
export default function Home({ dog, events, lastAccident, loaded, log: logEvent }: Props) {
  const [picking, setPicking] = useState<EventDef | null>(null)
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
    <>
      <h1>{dog?.name ?? 'Puppy tracker'}</h1>
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

      <p className="muted">Signed in as {pb.authStore.record?.email}</p>
      <button className="quiet" onClick={() => pb.authStore.clear()}>
        Sign out
      </button>
    </>
  )
}

