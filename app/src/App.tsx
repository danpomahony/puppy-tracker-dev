import { useEffect, useState } from 'react'
import { pb } from './lib/pb'
import Login from './Login'
import Home from './Home'

export default function App() {
  const [signedIn, setSignedIn] = useState(pb.authStore.isValid)

  // Re-render whenever the login state changes (sign in, sign out, expiry).
  // onChange returns an unsubscribe function, which React calls on cleanup.
  useEffect(() => pb.authStore.onChange(() => setSignedIn(pb.authStore.isValid)), [])

  return signedIn ? <Home /> : <Login />
}
