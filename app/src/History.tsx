import { useState } from 'react'
import { defFor } from './events/registry'
import type { EventRecord } from './events/types'
import { EVENT_LIMIT } from './lib/useEvents'
import { dayStart, nextDayStart, sleepByDay } from './lib/sleep'
import { dayLabel, duration, timeOfDay, toDate, useNow } from './lib/time'
import EditSheet from './EditSheet'
import './history.css'

// One line in the list: a logged event, or a computed daily sleep total.
type Item = { kind: 'event'; at: number; e: EventRecord } | { kind: 'total'; at: number; start: number; ms: number }

interface Props {
  events: EventRecord[]
  loaded: boolean
  reload: () => void
}

// Every loaded entry, newest first, under a heading for each day.
export default function History({ events, loaded, reload }: Props) {
  const [editing, setEditing] = useState<EventRecord | null>(null)
  const now = useNow()

  // A finished sleep day gets one computed entry, stamped with the moment the day ended.
  // It is worked out from the sleeps each time, never stored, so fixing a sleep time fixes
  // the total. When the list is cut off at EVENT_LIMIT, the oldest sleep day may be missing
  // some of its sleeps, so it is left out.
  const oldest = events.at(-1)
  const firstComplete = events.length >= EVENT_LIMIT && oldest ? nextDayStart(dayStart(toDate(oldest.started_at).getTime())) : 0
  const totals: Item[] = [...sleepByDay(events, now)]
    .filter(([start]) => nextDayStart(start) <= now && start >= firstComplete)
    .map(([start, ms]) => ({ kind: 'total', at: nextDayStart(start), start, ms }))

  // Newest first. Entries from the same local day sit together under one heading.
  const items: Item[] = [...events.map((e): Item => ({ kind: 'event', at: toDate(e.started_at).getTime(), e })), ...totals].sort(
    (a, b) => b.at - a.at,
  )
  const days: { key: string; label: string; items: Item[] }[] = []
  for (const item of items) {
    const d = new Date(item.at)
    const key = d.toDateString()
    const last = days.at(-1)
    if (last?.key === key) last.items.push(item)
    else days.push({ key, label: dayLabel(d, now), items: [item] })
  }

  return (
    <>
      <h1>History</h1>
      {loaded && events.length === 0 && <p className="muted">Nothing logged yet. Entries show up here as soon as anyone logs one.</p>}

      {days.map((day) => (
        <section key={day.key}>
          <h2>{day.label}</h2>
          <ul className="entries">
            {day.items.map((item) => {
              if (item.kind === 'total') {
                return (
                  <li key={`total-${item.start}`} className="total">
                    <div className="row">
                      <span>
                        Sleep total: {duration(item.ms)}
                        <small>Day starting {new Date(item.start).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</small>
                      </span>
                      <time dateTime={new Date(item.at).toISOString()}>{timeOfDay(new Date(item.at))}</time>
                    </div>
                  </li>
                )
              }
              const e = item.e
              return (
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
              )
            })}
          </ul>
        </section>
      ))}

      {events.length >= EVENT_LIMIT && <p className="muted">Showing the latest {EVENT_LIMIT} entries.</p>}
    </>
  )
}
