import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { connect } from './backend'
import './styles.css'

const root = createRoot(document.getElementById('root')!)

// With Supabase configured the season comes from the database, so the app (whose modules read
// LEAGUES, TEAMS and MATCHES when they load) is imported only after it has arrived.
connect()
  .then(() => import('./App'))
  .then(({ default: App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((e) => {
    console.error(e)
    root.render(
      <p className="wrap page muted" role="alert">
        Die Spieldaten konnten gerade nicht geladen werden. Bitte lade die Seite in einem Moment neu.
      </p>,
    )
  })
