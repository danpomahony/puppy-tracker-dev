import { useEffect } from 'react'
import { useEvents } from './lib/useEvents'
import { useHash } from './lib/useHash'
import Home from './Home'
import History from './History'
import Words from './Words'
import './app-shell.css'

// The signed-in app: loads the data once for both screens and shows the tab bar.
// Keeping useEvents here, rather than in each screen, means switching tabs is
// instant and there is only ever one realtime subscription.
export default function AppShell() {
  const { dog, events, lastAccident, loaded, problem, log, finish, reload } = useEvents()
  const hash = useHash()
  const screen = hash === 'history' || hash === 'words' ? hash : 'log'

  // Each screen starts at the top, not wherever the last one was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  return (
    <>
      <main>
        {problem && <p className="error">{problem}</p>}
        {screen === 'history' ? (
          <History events={events} loaded={loaded} reload={reload} />
        ) : screen === 'words' ? (
          <Words />
        ) : (
          <Home dog={dog} events={events} lastAccident={lastAccident} loaded={loaded} log={log} finish={finish} />
        )}
      </main>

      <nav className="tabs" aria-label="Screens">
        <a href="#" aria-current={screen === 'log' ? 'page' : undefined}>
          Log
        </a>
        <a href="#history" aria-current={screen === 'history' ? 'page' : undefined}>
          History
        </a>
        <a href="#words" aria-current={screen === 'words' ? 'page' : undefined}>
          Words
        </a>
      </nav>
    </>
  )
}
