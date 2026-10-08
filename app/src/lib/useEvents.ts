import { useCallback, useEffect, useState } from 'react'
import { pb } from './pb'
import { nowIso } from './time'
import { newId } from '../events/types'
import type { EventRecord } from '../events/types'

export interface Dog {
  id: string
  name: string
}

// How many of the latest events are loaded. Older ones aren't shown yet.
export const EVENT_LIMIT = 200

// Fetches the dog, the latest events and the latest accident in one go. The
// accident is fetched on its own because it can be older than the events in the list. requestKey: null stops the
// SDK cancelling one request when another of the same kind starts.
async function fetchAll() {
  const [dogs, evs, accidents] = await Promise.all([
    pb.collection('dogs').getList(1, 1, { requestKey: null }),
    pb.collection('events').getList<EventRecord>(1, EVENT_LIMIT, {
      sort: '-started_at',
      expand: 'logged_by',
      requestKey: null,
    }),
    pb.collection('events').getList<EventRecord>(1, 1, {
      filter: 'type = "accident"',
      sort: '-started_at',
      requestKey: null,
    }),
  ])
  const d = dogs.items[0]
  return {
    dog: d ? ({ id: d.id, name: d.name } as Dog) : null,
    events: evs.items,
    lastAccident: accidents.items[0] ?? null,
  }
}

// A custom hook: a function whose name starts with "use" that can use React's
// own hooks. Any screen can call it to get the dog, the event log (kept up to
// date in real time) and a way to log new events, without knowing about PocketBase.
export function useEvents() {
  const [dog, setDog] = useState<Dog | null>(null)
  const [events, setEvents] = useState<EventRecord[]>([])
  const [lastAccident, setLastAccident] = useState<EventRecord | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [problem, setProblem] = useState('')

  // State is only set once the request finishes (inside .then), never
  // synchronously, so calling this from an effect doesn't cause an extra render.
  const reload = useCallback(
    () =>
      fetchAll().then(
        (r) => {
          setDog(r.dog)
          setEvents(r.events)
          setLastAccident(r.lastAccident)
          setProblem('')
          setLoaded(true)
        },
        () => setProblem("Couldn't load entries. Check that the backend is running."),
      ),
    [],
  )

  useEffect(() => {
    void reload()
    // Realtime: reload whenever anyone in the family logs, edits or deletes something.
    // subscribe() resolves to this subscription's own unsubscribe function, so
    // cleaning up never removes another screen's subscription.
    // If subscribing fails, the app still works; it just won't update live.
    const unsubscribe = pb
      .collection('events')
      .subscribe('*', () => void reload())
      .catch(() => undefined)
    return () => {
      void unsubscribe.then((stop) => stop?.())
    }
  }, [reload])

  const log = useCallback(
    async (type: string, data: Record<string, unknown>) => {
      if (!dog) return
      try {
        await pb.collection('events').create({
          id: newId(),
          dog: dog.id,
          type,
          started_at: nowIso(),
          logged_by: pb.authStore.record?.id,
          data,
          v: 1,
        })
        await reload()
      } catch {
        setProblem("Couldn't save that. Check the connection and try again.")
      }
    },
    [dog, reload],
  )

  // Ends an event that is still open, such as a sleep, by stamping its end time.
  const finish = useCallback(
    async (id: string) => {
      try {
        await pb.collection('events').update(id, { ended_at: nowIso() })
        await reload()
      } catch {
        setProblem("Couldn't save that. Check the connection and try again.")
      }
    },
    [reload],
  )

  return { dog, events, lastAccident, loaded, problem, log, finish, reload }
}
