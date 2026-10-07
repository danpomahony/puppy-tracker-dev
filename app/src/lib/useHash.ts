import { useSyncExternalStore } from 'react'

// The part of the address after "#", for example "history". Tabs are plain links
// that change it, so each tab switch is a step in the browser's history and the
// phone's back button works as expected. Like the clock in time.ts, the address
// is outside React, so useSyncExternalStore is the way to read it.
export function useHash(): string {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('hashchange', onChange)
      return () => window.removeEventListener('hashchange', onChange)
    },
    () => window.location.hash.slice(1),
  )
}
