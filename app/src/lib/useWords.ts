import { useCallback, useEffect, useState } from 'react'
import { pb } from './pb'
import type { Word } from './words'

// The words, kept up to date in real time. Only the Words screen uses this, so
// the subscription exists only while that tab is open. requestKey: null stops the
// SDK cancelling one request when another of the same kind starts.
export function useWords() {
  const [words, setWords] = useState<Word[]>([])
  const [loaded, setLoaded] = useState(false)
  const [problem, setProblem] = useState('')

  const reload = useCallback(
    () =>
      pb
        .collection('words')
        .getFullList<Word>({ sort: 'term', requestKey: null })
        .then(
          (items) => {
            setWords(items)
            setProblem('')
            setLoaded(true)
          },
          () => setProblem("Couldn't load words. Check that the backend is running."),
        ),
    [],
  )

  useEffect(() => {
    void reload()
    const unsubscribe = pb
      .collection('words')
      .subscribe('*', () => void reload())
      .catch(() => undefined)
    return () => {
      void unsubscribe.then((stop) => stop?.())
    }
  }, [reload])

  return { words, loaded, problem, reload }
}
