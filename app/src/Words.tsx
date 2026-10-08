import { useState } from 'react'
import { useWords } from './lib/useWords'
import { agreedOf, groupByCategory, statusOf } from './lib/words'
import type { Word } from './lib/words'
import WordSheet from './WordSheet'
import './history.css'
import './words.css'

// The Words tab: the family's vocabulary, grouped by category. Tapping a word
// opens its edit sheet under it. `editing` is a word, 'new', or null for none.
export default function Words() {
  const { words, loaded, problem, reload } = useWords()
  const [editing, setEditing] = useState<Word | 'new' | null>(null)

  return (
    <>
      <h1>Words</h1>
      {problem && <p className="error">{problem}</p>}
      {loaded && words.length === 0 && (
        <p className="muted">No words yet. Add the first one so everyone uses the same word for the same thing.</p>
      )}

      {editing === 'new' ? (
        <WordSheet word={null} onClose={() => setEditing(null)} onSaved={reload} />
      ) : (
        <button className="add" onClick={() => setEditing('new')}>Add a word</button>
      )}

      {groupByCategory(words).map((group) => (
        <section key={group.category}>
          <h2>{group.category}</h2>
          <ul className="entries">
            {group.words.map((w) => (
              <li key={w.id}>
                <button className="row" onClick={() => setEditing(editing !== 'new' && editing?.id === w.id ? null : w)}>
                  <span>
                    {w.term}
                    <small>{w.description?.trim()}</small>
                  </span>
                  <span className="badges">
                    {agreedOf(w) === 'proposed' && <em>Needs confirming</em>}
                    <strong>{statusOf(w)}</strong>
                  </span>
                </button>
                {editing !== 'new' && editing?.id === w.id && (
                  <WordSheet key={w.id} word={w} onClose={() => setEditing(null)} onSaved={reload} />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
