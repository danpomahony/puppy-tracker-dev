import { useCallback, useEffect, useState } from 'react'
import { pb } from './pb'
import { nowIso } from './time'
import { newId } from '../events/types'
import type { EventRecord } from '../events/types'

export interface Dog {
  id: string
  name: string
}

// Fetches the dog and the latest events in one go. requestKey: null stops the
// SDK cancelling one request when another of the same kind starts.
async function fetchAll() {
  const [dogs, evs] = await Promise.all([
    pb.collection('dogs').getList(1, 1, { requestKey: null }),
    pb.collection('events').getList<EventRecord>(1, 200, {
      sort: '-started_at',
      expand: 'logged_by',
      requestKey: null,
    }),
  ])
  const d = dogs.items[0]
  return { dog: d ? ({ id: d.id, name: d.name } as Dog) : null, events: evs.items }
}

// A custom hook: a function whose name starts with "use" that can use React's
// own hooks. Any screen can call it to get the dog, the event log (kept up to
// date in real time) and a way to log new events, without knowing about PocketBase.
export function useEvents() {
  const [dog, setDog] = useState<Dog | null>(null)
  const [events, setEvents] = useState<EventRecord[]>([])
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

  return { dog, events, loaded, problem, log, reload }
}
