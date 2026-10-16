import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarCheck2, MapPin, Trophy, Users } from 'lucide-react'
import { useStore } from '../lib/store'
import {
  computeStandings,
  fmtShort,
  LEAGUES,
  matchDate,
  NOW,
  relativeDay,
  SEASON,
  setsWon,
  TEAM_BY_ID,
  TEAMS,
  weekdayOf,
} from '../data/season'
import { POSTS, TOURNAMENTS } from '../data/community'
import { CountUp, rise, stagger, TeamBadge } from '../components/ui'

const VolleyBall3D = lazy(() => import('../three/VolleyBall3D'))

function Ticker() {
  const { matches } = useStore()
  const recent = matches.filter((m) => m.sets).slice(-14).reverse()
  if (!recent.length) return null
  const row = recent.map((m) => {
    const [h, a] = setsWon(m.sets!)
    return (
      <Link key={m.id} to={`/tabellen/${m.league}`} className="tick">
        <span className="tick-league">L{m.league}</span>
        <span className={h > a ? 'w' : ''}>{TEAM_BY_ID.get(m.home)!.name}</span>
        <b className="tick-score">
          {h}:{a}
        </b>
        <span className={a > h ? 'w' : ''}>{TEAM_BY_ID.get(m.away)!.name}</span>
      </Link>
    )
  })
  return (
    <div className="ticker" aria-label="Neueste Ergebnisse">
      <span className="ticker-label">
        <i className="live-dot" /> Ergebnisse
      </span>
      <div className="ticker-track">
        <div className="ticker-move">
          {row}
          <span aria-hidden className="ticker-dup">{row}</span>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  const [spikes, setSpikes] = useState(0)
  const { user } = useStore()
  const words = ['Pritschen.', 'Baggern.', 'Schmettern.']
  return (
    <section className="hero wrap">
      <motion.div className="hero-copy" variants={stagger} initial="hidden" animate="show">
        <motion.p className="eyebrow" variants={rise}>
          Saison {SEASON} · {LEAGUES.length} Ligen · {TEAMS.length} Mannschaften
        </motion.p>
        <motion.h1 className="hero-title" variants={rise}>
          {words.map((w, i) => (
            <span key={w} className="hero-word" style={{ '--i': i } as React.CSSProperties}>
              {w}
            </span>
          ))}
          <span className="hero-sub-title">Feierabend in München.</span>
        </motion.h1>
        <motion.p className="lead" variants={rise}>
          Die Breitensportliga für alle, die nach der Arbeit lieber in der Halle stehen. Tabellen, Spielpläne,
          Hallenzeiten und die Trainingsplanung deines Teams an einem Ort.
        </motion.p>
        <motion.div className="hero-cta" variants={rise}>
          <Link to="/tabellen" className="btn btn-primary">
            Tabellen & Spielpläne <ArrowRight size={18} />
          </Link>
          <Link to={user ? '/mein-team' : '/login'} className="btn btn-ghost">
            {user ? 'Zum Training zusagen' : 'Anmelden fürs Team'}
          </Link>
        </motion.div>
      </motion.div>
      <div className="hero-ball-wrap" onClickCapture={() => setSpikes((s) => s + 1)}>
        <Suspense fallback={<div className="hero-ball" />}>
          <VolleyBall3D className="hero-ball" />
        </Suspense>
        <p className="ball-hint">
          {spikes === 0 ? 'Klick auf den Ball zum Schmettern' : spikes < 5 ? `${spikes}× geschmettert` : `${spikes}× geschmettert. Ab ins Training!`}
        </p>
      </div>
    </section>
  )
}

function ThisWeek() {
  const { matches } = useStore()
  const [league, setLeague] = useState<string>('alle')
  const [showAll, setShowAll] = useState(false)
  const end = new Date(NOW)
  end.setDate(end.getDate() + 7)
  const upcoming = matches.filter((m) => !m.sets && matchDate(m) >= NOW && matchDate(m) <= end && (league === 'alle' || m.league === league))
  const LIMIT = 10
  const groups = useMemo(() => {
    const g = new Map<string, typeof upcoming>()
    for (const m of showAll ? upcoming : upcoming.slice(0, LIMIT)) g.set(m.date, [...(g.get(m.date) ?? []), m])
    return [...g.entries()]
  }, [upcoming, showAll])

  return (
    <section className="wrap section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Die nächsten 7 Tage</p>
          <h2>Spiele diese Woche</h2>
        </div>
        <div className="chips" role="group" aria-label="Liga filtern">
          {['alle', '1', '2A', '2B', '3A', '4A', '5A'].map((l) => (
            <button
              key={l}
              className={`chip${league === l ? ' on' : ''}`}
              onClick={() => {
                setLeague(l)
                setShowAll(false)
              }}
            >
              {l === 'alle' ? 'Alle Ligen' : `Liga ${l}`}
            </button>
          ))}
        </div>
      </div>
      <div className="week">
        {groups.length === 0 && <p className="empty">In dieser Liga ist diese Woche spielfrei.</p>}
        {groups.map(([day, list]) => {
          const d = matchDate(list[0])
          return (
            <motion.div key={day} className="week-day" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="week-date">
                <span className="wd">{weekdayOf(d)}</span>
                <span className="dd">{fmtShort(d)}</span>
                <span className="rel">{relativeDay(d)}</span>
              </div>
              <ul className="week-list">
                {list.map((m) => {
                  const h = TEAM_BY_ID.get(m.home)!
                  const a = TEAM_BY_ID.get(m.away)!
                  return (
                    <li key={m.id} className="fixture">
                      <span className="fixture-time">{m.time}</span>
                      <span className="fixture-teams">
                        <Link to={`/mannschaften/${h.id}`} className="fx-team">
                          <TeamBadge team={h} size={24} /> {h.name}
                        </Link>
                        <span className="vs">vs</span>
                        <Link to={`/mannschaften/${a.id}`} className="fx-team">
                          <TeamBadge team={a} size={24} /> {a.name}
                        </Link>
                      </span>
                      <span className="fixture-meta">
                        <span className="league-tag">L{m.league}</span>
                        <span className="venue">
                          <MapPin size={13} /> {m.venue}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </motion.div>
          )
        })}
        {upcoming.length > LIMIT && (
          <button className="btn btn-ghost btn-sm week-more" onClick={() => setShowAll((s) => !s)}>
            {showAll ? 'Weniger zeigen' : `Alle ${upcoming.length} Spiele zeigen`}
          </button>
        )}
      </div>
    </section>
  )
}

function Pyramid() {
  const { matches } = useStore()
  const tiers = [1, 2, 3, 4, 5]
  return (
    <section className="wrap section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Auf- und Abstieg</p>
          <h2>Die Ligapyramide</h2>
        </div>
        <p className="muted section-note">Die Ersten steigen auf, die Letzten ab. Tipp auf eine Liga, um die ganze Tabelle zu sehen.</p>
      </div>
      <div className="pyramid">
        {tiers.map((tier) => (
          <div key={tier} className="pyr-row" style={{ '--tier': tier } as React.CSSProperties}>
            {LEAGUES.filter((l) => l.tier === tier).map((l, i) => {
              const top = computeStandings(l.id, matches)[0]
              return (
                <motion.div key={l.id} initial={{ scale: 0.94 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: tier * 0.06 + i * 0.03 }}>
                  <Link to={`/tabellen/${l.id}`} className="pyr-cell">
                    <span className="pyr-id">{l.id}</span>
                    <span className="pyr-lead">
                      <Trophy size={12} /> {top.team.name}
                    </span>
                    <span className="pyr-pts">{top.points} Pkt</span>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}

function Stats() {
  const { matches } = useStore()
  const played = matches.filter((m) => m.sets)
  const sets = played.reduce((n, m) => n + m.sets!.length, 0)
  const balls = played.reduce((n, m) => n + m.sets!.reduce((x, [a, b]) => x + a + b, 0), 0)
  const tiebreaks = played.filter((m) => m.sets!.length === 3).length
  return (
    <section className="wrap stats">
      <div className="stat">
        <CountUp value={played.length} />
        <span>Spiele gespielt</span>
      </div>
      <div className="stat">
        <CountUp value={sets} />
        <span>Sätze</span>
      </div>
      <div className="stat">
        <CountUp value={balls} />
        <span>Ballwechsel gewonnen</span>
      </div>
      <div className="stat">
        <CountUp value={played.length ? (tiebreaks / played.length) * 100 : 0} suffix=" %" />
        <span>Spiele im Entscheidungssatz</span>
      </div>
    </section>
  )
}

function Community() {
  const fresh = POSTS.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  return (
    <section className="wrap section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Was geschah in den letzten Tagen</p>
          <h2>Neu in der Liga</h2>
        </div>
        <Link to="/community" className="link-arrow">
          Börse & Forum <ArrowRight size={16} />
        </Link>
      </div>
      <div className="news-grid">
        {fresh.map((p) => (
          <Link to="/community" key={p.id} className="news-card">
            <span className={`tag tag-${p.kind}`}>{p.kind === 'forum' ? 'Forum' : 'Spielerbörse'}</span>
            <h3>{p.title}</h3>
            <p className="muted">{p.excerpt}</p>
            <span className="news-meta">
              {p.author} · {relativeDay(new Date(p.date))} · {p.replies} Antworten
            </span>
          </Link>
        ))}
        <Link to="/termine" className="news-card news-turnier">
          <span className="tag tag-turnier">Turniere</span>
          <ul className="mini-list">
            {TOURNAMENTS.slice(0, 3).map((t) => (
              <li key={t.id}>
                <b>{fmtShort(new Date(t.date))}</b>
                <span>{t.title}</span>
              </li>
            ))}
          </ul>
          <span className="news-meta">Alle Turniere ansehen</span>
        </Link>
      </div>
    </section>
  )
}

function TrainingTeaser() {
  const { user } = useStore()
  return (
    <section className="wrap section">
      <div className="teaser">
        <div className="teaser-copy">
          <p className="eyebrow">Für Mannschaften</p>
          <h2>Wer kommt Dienstag?</h2>
          <p className="lead">
            Zu- und Absagen fürs Training, Trainingsbeteiligung pro Person, Ergebnisse eintragen und Heimspiele verlegen.
            Alles im Bereich „Mein Team“.
          </p>
          <div className="teaser-points">
            <span>
              <CalendarCheck2 size={18} /> Zusagen mit einem Tipp
            </span>
            <span>
              <Users size={18} /> Sofort sehen, ob sechs zusammenkommen
            </span>
            <span>
              <Trophy size={18} /> Ergebnis eintragen, Tabelle rechnet mit
            </span>
          </div>
          <Link to={user ? '/mein-team' : '/login'} className="btn btn-primary">
            {user ? 'Zu Mein Team' : 'Demo-Login ausprobieren'} <ArrowRight size={18} />
          </Link>
        </div>
        <div className="teaser-visual" aria-hidden>
          <div className="mock-session">
            <span className="ms-day">Di 20:00</span>
            <span className="ms-title">Annahme & Abwehr</span>
            <div className="ms-bar">
              <i style={{ width: '72%' }} />
            </div>
            <span className="ms-count">8 von 11 dabei</span>
            <div className="ms-faces">
              {['LH', 'JB', 'AY', 'TL', 'CN', 'MR', 'QO', 'SK'].map((f, i) => (
                <span key={f} style={{ '--d': i } as React.CSSProperties}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <ThisWeek />
      <Stats />
      <Pyramid />
      <TrainingTeaser />
      <Community />
    </>
  )
}
