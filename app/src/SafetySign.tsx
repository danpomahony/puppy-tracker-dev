import './safety-sign.css'

interface Props {
  since: Date | null // when the last accident happened, or null if there has never been one
  now: number
}

// A worksite-style "days since last accident" notice, for fun.
export default function SafetySign({ since, now }: Props) {
  const minutes = since ? Math.max(0, Math.floor((now - since.getTime()) / 60_000)) : 0
  const units = [
    { value: Math.floor(minutes / 1440), one: 'day', many: 'days' },
    { value: Math.floor(minutes / 60) % 24, one: 'hour', many: 'hours' },
    { value: minutes % 60, one: 'minute', many: 'minutes' },
  ]

  return (
    <section className="safety-sign" aria-label="Safety notice">
      <p className="safety-sign-header">Safety first</p>
      {since ? (
        <>
          <p>This household has gone</p>
          <div className="safety-sign-counter">
            {units.map((u) => (
              <div key={u.one}>
                <span className="safety-sign-digits">{u.value}</span>
                {u.value === 1 ? u.one : u.many}
              </div>
            ))}
          </div>
          <p>without an accident</p>
        </>
      ) : (
        <p>No accidents on record. Keep up the good work!</p>
      )}
    </section>
  )
}
