import { useEffect, useRef, useState } from 'react'
import { eventDefs } from './events/registry'
import { isOpen, missingChoice, missingNote } from './events/types'
import type { EventDef, EventRecord } from './events/types'
import { pb } from './lib/pb'
import { dayStart, sleepByDay, sleepStatus } from './lib/sleep'
import { ago, duration, toDate, useNow } from './lib/time'
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
]

interface Props {
  dog: Dog | null
  events: EventRecord[]
  lastAccident: EventRecord | null
  loaded: boolean
  log: (type: string, data: Record<string, unknown>, note?: string) => Promise<void>
  finish: (id: string) => Promise<void>
}

const sleepTotal = (ms: number | undefined) => (ms ? duration(ms) : 'Not yet')

// The Log tab: the safety sign, the log buttons and the "time since" tiles.
export default function Home({ dog, events, lastAccident, loaded, log: logEvent, finish }: Props) {
  const [picking, setPicking] = useState<EventDef | null>(null)
  const [chosen, setChosen] = useState<Record<string, boolean>>({})
  const [note, setNote] = useState('')
  const now = useNow()
  const hint = picking ? missingChoice(picking, chosen) || missingNote(picking, note) : ''
  const pickerRef = useRef<HTMLFormElement>(null)

  const today = dayStart(now)
  const slept = sleepByDay(events, now)
  const yesterday = dayStart(today - 1)
  const sleeping = sleepStatus(events)

  // When the picker opens, bring it fully into view (like the edit sheet does) so
  // its choices and Save button aren't hidden below the bottom of the screen.
  // When it closes, by Save or Cancel, go back to the top to see the sign and tiles.
  useEffect(() => {
    if (picking) pickerRef.current?.scrollIntoView({ block: 'center' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [picking])

  function log(def: EventDef, data: Record<string, boolean>, text = '') {
    setPicking(null)
    void logEvent(def.type, data, text)
  }

  function tap(def: EventDef) {
    // A button for something that lasts a while ends the open one, if there is one.
    const open = def.span && events.find((e) => e.type === def.type && isOpen(e))
    if (open) {
      void finish(open.id)
      return
    }
    // One tap logs it, unless it needs a choice or a note first.
    if (def.toggles.length === 0 && !def.noteRequired) {
      log(def, {})
      return
    }
    setChosen({})
    setNote('')
    setPicking(def)
  }

  return (
    <>
      <header className="log-header">
        <h1>{dog?.name ?? 'Puppy tracker'}</h1>
        <button className="quiet" title={`Signed in as ${pb.authStore.record?.email}`} onClick={() => pb.authStore.clear()}>
          Sign out
        </button>
      </header>
      {loaded && !dog && <p>No dog added yet. Add one in the PocketBase dashboard.</p>}
      {loaded && dog && <SafetySign since={lastAccident && toDate(lastAccident.started_at)} now={now} />}

      <section className="log">
        {eventDefs.map((def) => {
          const open = def.span && events.some((e) => e.type === def.type && isOpen(e))
          return (
            <button key={def.type} className={def.span ? 'wide' : undefined} disabled={!dog} onClick={() => tap(def)}>
              {open ? def.span?.endLabel : def.label}
            </button>
          )
        })}
      </section>

      {picking && (
        <form
          className="sheet"
          ref={pickerRef}
          onSubmit={(e) => {
            e.preventDefault()
            // Always send every toggle, so "nothing happened" is saved as false, not missing.
            log(picking, Object.fromEntries(picking.toggles.map((t) => [t.key, !!chosen[t.key]])), note)
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
          <label>
            {picking.noteRequired ? 'Note' : 'Note (optional)'}
            <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} autoFocus={!!picking.noteRequired} />
          </label>
          {hint && <p className="muted">{hint}</p>}
          <button type="submit" disabled={!!hint}>
            Save
          </button>
          <button type="button" className="quiet" onClick={() => setPicking(null)}>
            Cancel
          </button>
        </form>
      )}

      <dl className="tiles sleep-tiles">
        <div>
          <dt>{sleeping.asleep ? 'Asleep for' : 'Awake for'}</dt>
          <dd>{sleeping.since === null ? 'No sleep yet' : duration(now - sleeping.since)}</dd>
        </div>
        <div>
          <dt>Slept today</dt>
          <dd>{sleepTotal(slept.get(today))}</dd>
        </div>
        <div>
          <dt>Yesterday</dt>
          <dd>{sleepTotal(slept.get(yesterday))}</dd>
        </div>
      </dl>

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
    </>
  )
}

