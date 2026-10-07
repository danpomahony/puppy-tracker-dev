import { useEffect, useState } from 'react'
import { pb } from './lib/pb'

export default function Home() {
  const [dogName, setDogName] = useState<string | null>(null) // null = still loading
  const [problem, setProblem] = useState('')

  useEffect(() => {
    // requestKey: null stops the SDK auto-cancelling the first request when
    // React runs this effect twice in development.
    pb.collection('dogs')
      .getList(1, 1, { requestKey: null })
      .then((res) => setDogName(res.items[0]?.name ?? ''))
      .catch(() => setProblem("Couldn't load your dog. Check that the backend is running."))
  }, [])

  return (
    <main>
      <h1>{dogName || 'Puppy tracker'}</h1>
      {problem && <p className="error">{problem}</p>}
      {dogName === '' && <p>No dog added yet. Add one in the PocketBase dashboard.</p>}
      <p className="muted">Signed in as {pb.authStore.record?.email}</p>
      <button className="quiet" onClick={() => pb.authStore.clear()}>
        Sign out
      </button>
    </main>
  )
}
