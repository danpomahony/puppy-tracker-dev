import { useCallback, useEffect, useState } from 'react'
import { pb } from './lib/pb'
import { eventDefs, defFor } from './events/registry'
import { newId } from './events/types'
import type { EventDef, EventRecord } from './events/types'
import { ago, toDate } from './lib/time'
import EditSheet from './EditSheet'
import './home.css'

const tiles: { label: string; match: (e: EventRecord) => boolean }[] = [
  { label: 'Fed', match: (e) => e.type === 'feed' },
  { label: 'Outside', match: (e) => e.type === 'outside' },
  { label: 'Pee outside', match: (e) => e.type === 'outside' && e.data?.pee === true },
  { label: 'Tiko outside', match: (e) => e.type === 'outside' && e.data?.tiko === true },
  { label: 'Accident', match: (e) => e.type === 'accident' },
]

export default function Home() {
  const [dog, setDog] = useState<{ id: string; name: string } | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [events, setEvents] = useState<EventRecord[]>([])
  const [picking, setPicking] = useState<EventDef | null>(null)
  const [editing, setEditing] = useState<EventRecord | null>(null)
  const [chosen, setChosen] = useState<Record<string, boolean>>({})
  const [problem, setProblem] = useState('')
  const [now, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    try {
      const [dogs, evs] = await Promise.all([
        pb.collection('dogs').getList(1, 1, { requestKey: null }),
        pb.collection('events').getList<EventRecord>(1, 200, {
          sort: '-started_at',
          expand: 'logged_by',
          requestKey: null,
        }),
      ])
      const d = dogs.items[0]
      setDog(d ? { id: d.id, name: d.name } : null)
      setEvents(evs.items)
      setProblem('')
      setLoaded(true)
    } catch {
      setProblem("Couldn't load entries. Check that the backend is running.")
    }
  }, [])

  useEffect(() => {
    load()
    // Realtime: reload whenever anyone in the family logs something.
    pb.collection('events').subscribe('*', load)
    const tick = setInterval(() => setNow(Date.now()), 30_000)
    return () => {
      pb.collection('events').unsubscribe('*')
      clearInterval(tick)
    }
  }, [load])

  async function log(def: EventDef, data: Record<string, boolean>) {
    if (!dog) return
    setPicking(null)
    try {
      await pb.collection('events').create({
        id: newId(),
        dog: dog.id,
        type: def.type,
        started_at: new Date().toISOString(),
        logged_by: pb.authStore.record?.id,
        data,
        v: 1,
      })
      await load()
    } catch {
      setProblem("Couldn't save that. Check the connection and try again.")
    }
  }

  function tap(def: EventDef) {
    if (def.toggles.length === 0) {
      void log(def, {})
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
          onSubmit={(e) => {
            e.preventDefault()
            // Always send every toggle, so "nothing happened" is saved as false, not missing.
            void log(picking, Object.fromEntries(picking.toggles.map((t) => [t.key, !!chosen[t.key]])))
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
          <button type="submit">Save</button>
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
                {toDate(e.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </time>
            </button>
          </li>
        ))}
      </ul>

      {editing && <EditSheet key={editing.id} event={editing} onClose={() => setEditing(null)} onSaved={load} />}

      <p className="muted">Signed in as {pb.authStore.record?.email}</p>
      <button className="quiet" onClick={() => pb.authStore.clear()}>
        Sign out
      </button>
    </main>
  )
}
