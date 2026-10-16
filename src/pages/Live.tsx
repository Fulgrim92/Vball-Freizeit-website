import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, LogIn, Radio } from 'lucide-react'
import { useStore } from '../lib/store'
import { TEAM_BY_ID } from '../data/season'
import { PageHead } from '../components/ui'
import { useLive } from '../live/LiveProvider'
import { LiveCard, useReportable } from '../live/LiveViews'

function ReportCta() {
  const { user } = useStore()
  const { game } = useLive()
  const mine = useReportable()
  if (!user) {
    return (
      <aside className="panel live-cta">
        <Radio size={22} />
        <p>
          <b>Ihr spielt gerade?</b> Wer im Team das Recht „Ergebnisse“ hat, meldet euer Heimspiel hier live, Punkt für Punkt.
        </p>
        <Link to="/login" state={{ from: '/mein-team' }} className="btn btn-primary btn-sm">
          <LogIn size={16} /> Anmelden
        </Link>
      </aside>
    )
  }
  if (!user.rights.includes('Ergebnisse')) {
    return (
      <aside className="panel live-cta">
        <Radio size={22} />
        <p>Live melden dürfen alle mit dem Recht „Ergebnisse“. Das vergeben eure Mannschaftsverantwortlichen unter „Kader & Rechte“.</p>
      </aside>
    )
  }
  const running = mine.find((m) => game(m.id)?.status === 'live')
  return (
    <aside className="panel live-cta">
      <Radio size={22} />
      <p>
        {running ? (
          <>
            <b>Ihr seid live</b> gegen {TEAM_BY_ID.get(running.away)!.name}.
          </>
        ) : mine.length ? (
          <>
            <b>Euer Heimspiel live melden.</b> Punkte zählen, Tabelle rechnet am Ende mit.
          </>
        ) : (
          'Gerade ist kein Heimspiel von euch offen.'
        )}
      </p>
      {mine.length > 0 && (
        <Link to="/mein-team" state={{ tab: 'live' }} className="btn btn-primary btn-sm">
          {running ? 'Weiter zählen' : 'Live melden'} <ArrowRight size={16} />
        </Link>
      )}
    </aside>
  )
}

export default function Live() {
  const { matches } = useStore()
  const { games, upcoming, now } = useLive()
  const byId = new Map(matches.map((m) => [m.id, m]))
  const running = games.filter((g) => g.status === 'live')
  const done = games.filter((g) => g.status === 'final')

  return (
    <div className="wrap page">
      <PageHead eyebrow="Spieltag" title="Live-Ticker">
        <p className="lead">
          {running.length === 0 ? 'Gerade läuft kein Spiel.' : running.length === 1 ? 'Ein Spiel läuft gerade.' : `${running.length} Spiele laufen gerade.`} Die
          Teams melden ihre Punkte selbst, der Stand aktualisiert sich von allein.
        </p>
      </PageHead>
      <ReportCta />
      {upcoming.length > 0 && (
        <ul className="live-soon">
          {upcoming.map((g) => {
            const m = byId.get(g.matchId)!
            const s = Math.max(0, Math.round((g.startedAt - now) / 1000))
            return (
              <li key={g.matchId}>
                <span className="league-tag">L{m.league}</span>
                <span>
                  {TEAM_BY_ID.get(m.home)!.name} – {TEAM_BY_ID.get(m.away)!.name}
                </span>
                <b>
                  Anpfiff in {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
                </b>
              </li>
            )
          })}
        </ul>
      )}
      {running.length > 0 && (
        <section className="live-section">
          <h2 className="live-h">
            <i className="live-dot" /> Jetzt live
          </h2>
          <div className="live-grid">
            {running.map((g) => (
              <LiveCard key={g.matchId} game={g} match={byId.get(g.matchId)!} />
            ))}
          </div>
        </section>
      )}
      {done.length > 0 && (
        <section className="live-section">
          <h2 className="live-h">Gerade beendet</h2>
          <div className="live-grid">
            {done.map((g) => (
              <LiveCard key={g.matchId} game={g} match={byId.get(g.matchId)!} />
            ))}
          </div>
        </section>
      )}
      <motion.p className="muted small live-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        Demo: Drei Spiele anderer Ligen werden simuliert und laufen in Schleife. Spartak Au meldet sein Heimspiel nach dem Login unter „Mein Team · Live“ selbst; öffne den Ticker
        in einem zweiten Tab, um die Punkte ankommen zu sehen.
      </motion.p>
    </div>
  )
}
