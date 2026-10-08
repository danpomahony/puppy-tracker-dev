import { useState } from 'react'
import { defFor } from './events/registry'
import type { EventRecord } from './events/types'
import { EVENT_LIMIT } from './lib/useEvents'
import { dayLabel, timeOfDay, toDate, useNow } from './lib/time'
import EditSheet from './EditSheet'
import './history.css'

interface Props {
  events: EventRecord[]
  loaded: boolean
  reload: () => void
}

// Every loaded entry, newest first, under a heading for each day.
export default function History({ events, loaded, reload }: Props) {
  const [editing, setEditing] = useState<EventRecord | null>(null)
  const now = useNow()

  // Events arrive newest first, so consecutive entries from the same local day
  // belong together and the days come out newest first too.
  const days: { key: string; label: string; events: EventRecord[] }[] = []
  for (const e of events) {
    const d = toDate(e.started_at)
    const key = d.toDateString()
    const last = days.at(-1)
    if (last?.key === key) last.events.push(e)
    else days.push({ key, label: dayLabel(d, now), events: [e] })
  }

  return (
    <>
      <h1>History</h1>
      {loaded && events.length === 0 && <p className="muted">Nothing logged yet. Entries show up here as soon as anyone logs one.</p>}

      {days.map((day) => (
        <section key={day.key}>
          <h2>{day.label}</h2>
          <ul className="entries">
            {day.events.map((e) => (
              <li key={e.id}>
                <button className="row" onClick={() => setEditing(editing?.id === e.id ? null : e)}>
                  <span>
                    {defFor(e.type).summary(e.data, e)}
                    <small>{e.expand?.logged_by?.name ?? ''}</small>
                  </span>
                  <time dateTime={e.started_at}>{timeOfDay(toDate(e.started_at))}</time>
                </button>
                {editing?.id === e.id && (
                  <EditSheet key={e.id} event={e} onClose={() => setEditing(null)} onSaved={reload} />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {events.length >= EVENT_LIMIT && <p className="muted">Showing the latest {EVENT_LIMIT} entries.</p>}
    </>
  )
}
