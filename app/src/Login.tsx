import { useState } from 'react'
import type { FormEvent } from 'react'
import { pb } from './lib/pb'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function signIn(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      // On success the auth store updates and App.tsx switches to the home screen.
      await pb.collection('users').authWithPassword(email, password)
    } catch {
      setError("Couldn't sign in. Check your email and password, then try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <h1>Puppy tracker</h1>
      <form onSubmit={signIn}>
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
