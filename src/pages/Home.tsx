import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowRight, CalendarCheck2, Compass, MapPin, MessagesSquare, Pause, Play, Plus, Radio, Trophy, Users } from 'lucide-react'
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
import { HOME_TOUR, TourInvite, TourOverlay, useTour } from '../components/Tour'
import { useLive } from '../live/LiveProvider'
import { derive } from '../live/engine'
import { LiveCard, useReportable } from '../live/LiveViews'


function Ticker() {
  const { matches } = useStore()
  const { games } = useLive()
  const onAir = games.filter((g) => g.status === 'live')
  const recent = matches.filter((m) => m.sets).slice(-14).reverse()
  if (!recent.length && !onAir.length) return null
  const liveRow = onAir.map((g) => {
    const m = matches.find((x) => x.id === g.matchId)!
    const st = derive(g.rallies)
    return (
      <Link key={'live-' + m.id} to="/live" className="tick tick-live">
        <span className="tick-league">Live</span>
        <span>{TEAM_BY_ID.get(m.home)!.name}</span>
        <b className="tick-score">
          {st.setsWon[0]}:{st.setsWon[1]}
        </b>
        {!st.decided && (
          <small className="tick-set">
            ({st.current[0]}:{st.current[1]})
          </small>
        )}
        <span>{TEAM_BY_ID.get(m.away)!.name}</span>
      </Link>
    )
  })
  const row = [...liveRow, ...recent.map((m) => {
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
  })]
  return (
    <div className="ticker" aria-label={onAir.length ? 'Live-Spiele und neueste Ergebnisse' : 'Neueste Ergebnisse'}>
      <Link to="/live" className="ticker-label">
        <i className="live-dot" /> {onAir.length ? `${onAir.length} live` : 'Ergebnisse'}
      </Link>
      <div className="ticker-track">
        <div className="ticker-move">
          {row}
          <span aria-hidden className="ticker-dup">{row}</span>
        </div>
      </div>
    </div>
  )
}

/** Showreel frame above table and live panel; a court-line placeholder stands in until the film loads. */
function Showreel() {
  const [ready, setReady] = useState(false)
  const [paused, setPaused] = useState(false)
  const ref = useRef<HTMLVideoElement>(null)
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return (
    <motion.figure className={`wrap showreel${ready ? ' is-ready' : ''}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
      <div className="showreel-frame">
        <div className="showreel-placeholder" aria-hidden>
          <svg viewBox="0 0 180 90" preserveAspectRatio="xMidYMid slice">
            <rect x="10" y="10" width="160" height="70" />
            <line x1="90" y1="6" x2="90" y2="84" className="net" />
            <line x1="63" y1="10" x2="63" y2="80" />
            <line x1="117" y1="10" x2="117" y2="80" />
          </svg>
          <span className="showreel-ball" />
        </div>
        <video
          ref={ref}
          autoPlay={!reduce}
          muted
          loop
          playsInline
          preload="auto"
          poster="showreel/showreel-poster.jpg"
          onLoadedData={() => setReady(true)}
          aria-label="Saisonfilm der Freizeitliga"
        >
          <source src="showreel/showreel-web.webm" type="video/webm" />
          <source src="showreel/showreel-web.mp4" type="video/mp4" />
        </video>
        <figcaption>
          <span className="eyebrow">Saisonfilm</span>
          <span>{ready ? '20 Sekunden Freizeitliga' : 'Der Film zur Saison kommt in Kürze'}</span>
        </figcaption>
        {ready && (
          <button
            className="video-toggle"
            onClick={() => {
              const v = ref.current!
              if (v.paused) v.play()
              else v.pause()
              setPaused(v.paused)
            }}
            aria-label={paused ? 'Video abspielen' : 'Video pausieren'}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        )}
      </div>
    </motion.figure>
  )
}

/** Front-page panel: running games first, else what just finished or is about to start. */
function LivePanel() {
  const { matches, user } = useStore()
  const { games, upcoming, now } = useLive()
  const mine = useReportable()
  const running = games.filter((g) => g.status === 'live')
  const shown = (running.length ? running : games).slice(0, 2)
  const byId = new Map(matches.map((m) => [m.id, m]))
  const next = upcoming[0]
  const nextMatch = next && byId.get(next.matchId)
  const s = next ? Math.max(0, Math.round((next.startedAt - now) / 1000)) : 0
  return (
    <section className="live-panel" aria-labelledby="live-panel-h" data-tour="live">
      <div className="panel live-panel-box">
        <div className="section-head">
          <div>
            <p className="eyebrow">Live aus den Hallen</p>
            <h2 id="live-panel-h" className="live-h">
              {running.length > 0 && <i className="live-dot" />}
              {running.length ? (running.length === 1 ? 'Ein Spiel läuft' : `${running.length} Spiele laufen`) : shown.length ? 'Gerade beendet' : 'Gerade kein Spiel'}
            </h2>
          </div>
          <div className="live-panel-actions">
            {user && mine.length > 0 && (
              <Link to="/mein-team" state={{ tab: 'live' }} className="btn btn-ghost btn-sm">
                <Radio size={16} /> Euer Spiel melden
              </Link>
            )}
            <Link to="/live" className="btn btn-primary btn-sm">
              {running.length > 2 ? `Alle ${running.length} Live-Spiele` : 'Zum Live-Ticker'} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        {shown.length > 0 && (
          <div className="live-grid">
            {shown.map((g) => (
              <LiveCard key={g.matchId} game={g} match={byId.get(g.matchId)!} />
            ))}
          </div>
        )}
        {nextMatch && (
          <p className="live-panel-next">
            <span className="league-tag">L{nextMatch.league}</span>
            <span>
              {TEAM_BY_ID.get(nextMatch.home)!.name} – {TEAM_BY_ID.get(nextMatch.away)!.name}
            </span>
            <b>
              Anpfiff in {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
            </b>
          </p>
        )}
      </div>
    </section>
  )
}

/** Slim intro line above the two headline panels; the showreel plays behind both. */
function Intro({ onTour }: { onTour: () => void }) {
  return (
    <motion.div className="wrap home-intro" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={rise}>
        <p className="eyebrow">
          Saison {SEASON} · {LEAGUES.length} Ligen · {TEAMS.length} Mannschaften
        </p>
        <h1 className="home-title">Freizeitliga Volleyball München</h1>
      </motion.div>
      <motion.div className="hero-cta" variants={rise}>
        <button className="btn btn-primary tour-btn" onClick={onTour}>
          <Compass size={20} />
          <span>
            Tour starten
            <small>Die Seite in einer Minute</small>
          </span>
          <ArrowRight size={18} />
        </button>
      </motion.div>
    </motion.div>
  )
}

function FeaturedTable() {
  const { matches } = useStore()
  const [league, setLeague] = useState('1')
  const rows = useMemo(() => computeStandings(league, matches), [league, matches])
  const tier = Number(league[0])
  const max = Math.max(2, ...rows.map((r) => r.points))
  return (
    <section className="panel feature-table" data-tour="tabelle" id="tabelle">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Tabelle {SEASON}</p>
          <h2>Liga {league}</h2>
        </div>
        <Link to={`/tabellen/${league}`} className="link-arrow">
          Spielplan & Details <ArrowRight size={16} />
        </Link>
      </div>
      <div className="mini-picker" role="tablist" aria-label="Liga wählen">
        {LEAGUES.map((l) => (
          <button key={l.id} role="tab" aria-selected={l.id === league} className={l.id === league ? 'on' : ''} onClick={() => setLeague(l.id)}>
            {l.id === league && <motion.span layoutId="mini-ind" className="mini-ind" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <span>{l.id}</span>
          </button>
        ))}
      </div>
      <ol className="ft-rows">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((r, i) => {
            const zone = tier > 1 && i === 0 ? 'up' : tier < 5 && i >= rows.length - 2 ? 'down' : ''
            return (
              <motion.li key={r.team.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.025 } }} exit={{ opacity: 0 }} className={zone}>
                <span className="pos">{i + 1}</span>
                <Link to={`/mannschaften/${r.team.id}`} className="ft-team">
                  <TeamBadge team={r.team} size={26} />
                  <span>{r.team.name}</span>
                </Link>
                <span className="ft-games mono">{r.played} Sp</span>
                <span className="ft-sets mono">
                  {r.setsFor}:{r.setsAgainst}
                </span>
                <span className="ft-bar">
                  <motion.i animate={{ width: `${(r.points / max) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                </span>
                <b className="ft-pts">{r.points}</b>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ol>
    </section>
  )
}

type FeedItem = { key: string; date: Date; kind: 'Ergebnis' | 'Forum' | 'Spielerbörse' | 'Turnier'; title: React.ReactNode; meta: string; to: string }

function RecentEvents() {
  const { matches, can } = useStore()
  const weekAgo = new Date(NOW)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const items: FeedItem[] = [
    ...matches
      .filter((m) => m.sets && matchDate(m) >= weekAgo)
      .slice(-6)
      .map((m) => {
        const [h, a] = setsWon(m.sets!)
        return {
          key: m.id,
          date: matchDate(m),
          kind: 'Ergebnis' as const,
          title: (
            <>
              <span className={h > a ? 'w' : ''}>{TEAM_BY_ID.get(m.home)!.name}</span> <b className="feed-score">{h}:{a}</b>{' '}
              <span className={a > h ? 'w' : ''}>{TEAM_BY_ID.get(m.away)!.name}</span>
            </>
          ),
          meta: `Liga ${m.league} · Spiel ${m.no}`,
          to: `/tabellen/${m.league}`,
        }
      }),
    ...POSTS.map((p) => ({
      key: p.id,
      date: new Date(p.date),
      kind: p.kind === 'forum' ? ('Forum' as const) : ('Spielerbörse' as const),
      title: p.title,
      meta: `${p.author} · ${p.replies} Antworten`,
      to: '/community',
    })),
  ].sort((x, y) => +y.date - +x.date)
  const shown = items.slice(0, 8)
  const next = TOURNAMENTS.filter((t) => new Date(t.date) >= NOW).slice(0, 2)
  return (
    <section className="panel feed" data-tour="events">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Aktuelles</p>
          <h2>Was geschah in den letzten Tagen</h2>
        </div>
        {can('Ergebnisse') && (
          <Link to="/mein-team" state={{ tab: 'ergebnis' }} className="btn btn-primary btn-sm">
            <Plus size={16} /> Ergebnis eintragen
          </Link>
        )}
      </div>
      <motion.ol className="feed-list" variants={stagger} initial="hidden" animate="show">
        {shown.map((it) => (
          <motion.li key={it.key} variants={rise}>
            <Link to={it.to} className="feed-item">
              <span className={`feed-icon k-${it.kind === 'Spielerbörse' ? 'boerse' : it.kind.toLowerCase()}`} aria-hidden>
                {it.kind === 'Ergebnis' ? <Trophy size={15} /> : it.kind === 'Forum' ? <MessagesSquare size={15} /> : <Users size={15} />}
              </span>
              <span className="feed-body">
                <span className="feed-title">{it.title}</span>
                <small>
                  {it.kind} · {relativeDay(it.date)} · {it.meta}
                </small>
              </span>
            </Link>
          </motion.li>
        ))}
      </motion.ol>
      <div className="feed-tournaments">
        {next.map((t) => (
          <Link key={t.id} to="/termine" className="feed-t">
            <b>{fmtShort(new Date(t.date))}</b>
            <span>{t.title}</span>
            <small>{t.spots - t.taken} Plätze frei</small>
          </Link>
        ))}
      </div>
    </section>
  )
}

function StepArrow() {
  const [atEnd, setAtEnd] = useState(false)
  useEffect(() => {
    const on = () => setAtEnd(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const go = () => {
    if (atEnd) return window.scrollTo({ top: 0, behavior: 'smooth' })
    const steps = [...document.querySelectorAll<HTMLElement>('[data-step]')]
    const next = steps.find((el) => el.getBoundingClientRect().top > 100)
    if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
  }
  return (
    <motion.button className="step-arrow" onClick={go} aria-label={atEnd ? 'Nach oben' : 'Zum nächsten Abschnitt'} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}>
      <motion.span animate={{ rotate: atEnd ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
        <ArrowDown size={22} />
      </motion.span>
      <span className="step-label">{atEnd ? 'Nach oben' : 'Weiter'}</span>
    </motion.button>
  )
}

function ThisWeek() {
  const { matches } = useStore()
  const live = useLive()
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
    <section className="wrap section" data-step data-tour="woche">
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
                        {live.game(m.id)?.status === 'live' && (
                          <Link to="/live" className="live-pill">
                            <i className="live-dot" /> Live
                          </Link>
                        )}
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
    <section className="wrap section" data-step data-tour="pyramide">
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
    <section className="wrap stats" data-step>
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

function TrainingTeaser() {
  const { user } = useStore()
  return (
    <section className="wrap section" data-step>
      <div className="teaser" data-tour="training">
        <div className="teaser-copy">
          <p className="eyebrow">Für Mannschaften</p>
          <h2>Wer kommt Donnerstag?</h2>
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
            <span className="ms-day">Do 20:00</span>
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
  const tour = useTour()
  return (
    <>
      <section className="top-stage" data-step>
        <Intro onTour={tour.start} />
        <Showreel />
        <div className="wrap top-grid">
          <FeaturedTable />
          <LivePanel />
        </div>
      </section>
      <Ticker />
      <div className="wrap section" data-step>
        <RecentEvents />
      </div>
      <ThisWeek />
      <Stats />
      <Pyramid />
      <TrainingTeaser />
      {tour.step === null && <StepArrow />}
      {tour.step === null && <TourInvite onStart={tour.start} />}
      <TourOverlay steps={HOME_TOUR} step={tour.step} setStep={tour.setStep} />
    </>
  )
}
