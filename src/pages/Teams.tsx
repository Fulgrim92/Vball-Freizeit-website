import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CalendarClock, Mail, MapPin, Search, Trophy } from 'lucide-react'
import { useStore } from '../lib/store'
import { computeStandings, fmtDate, matchDate, NOW, setsWon, TEAM_BY_ID, TEAMS, WEEKDAYS, WEEKDAYS_LONG, weekdayOf, type Team } from '../data/season'
import type { Slot } from '../data/teams'

const slotText = (slots: Slot[]) => slots.map((x) => `${WEEKDAYS[x.day]} ${x.from}${x.to ? `–${x.to}` : ''}`).join(' · ')
import { FormDots, PageHead, Segmented, SetPills, TeamBadge } from '../components/ui'

function TiltCard({ team, rank, children }: { team: Team; rank: number; children: React.ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current!
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${-y * 6}deg`)
    el.style.setProperty('--ry', `${x * 8}deg`)
    el.style.setProperty('--mx', `${(x + 0.5) * 100}%`)
    el.style.setProperty('--my', `${(y + 0.5) * 100}%`)
  }
  const reset = () => {
    ref.current?.style.setProperty('--rx', '0deg')
    ref.current?.style.setProperty('--ry', '0deg')
  }
  return (
    <Link ref={ref} to={`/mannschaften/${team.id}`} className="team-card" style={{ '--h': team.hue } as React.CSSProperties} onPointerMove={onMove} onPointerLeave={reset}>
      <span className="team-rank">#{rank}</span>
      {children}
    </Link>
  )
}

export function TeamsList() {
  const { matches } = useStore()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState<'alle' | '1' | '2' | '3' | '4' | '5'>('alle')
  const ranks = useMemo(() => {
    const m = new Map<string, { rank: number; points: number; form: ('S' | 'N')[] }>()
    for (const l of new Set(TEAMS.map((t) => t.league))) computeStandings(l, matches).forEach((r, i) => m.set(r.team.id, { rank: i + 1, points: r.points, form: r.form }))
    return m
  }, [matches])
  const list = TEAMS.filter((t) => (tier === 'alle' || t.league[0] === tier) && (t.name + ' ' + (t.club ?? '') + ' ' + t.venues.join(' ')).toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div className="wrap page">
      <PageHead eyebrow="Mannschaften" title={<>{TEAMS.length} Teams, eine Liga</>}>
        <div className="toolbar">
          <label className="search-field">
            <Search size={16} />
            <span className="sr-only">Mannschaft suchen</span>
            <input id="team-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Team, Verein oder Halle" />
          </label>
          <Segmented
            id="tier"
            value={tier}
            onChange={setTier}
            options={[{ value: 'alle', label: 'Alle' }, ...(['1', '2', '3', '4', '5'] as const).map((v) => ({ value: v, label: `Liga ${v}` }))]}
          />
        </div>
      </PageHead>
      <motion.div className="team-grid" layout>
        <AnimatePresence mode="popLayout">
          {list.map((t) => {
            const r = ranks.get(t.id)!
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
                <TiltCard team={t} rank={r.rank}>
                  <TeamBadge team={t} size={48} />
                  <h3>{t.name}</h3>
                  <p className="team-sub">
                    Liga {t.league} · {r.points} Punkte
                  </p>
                  {t.club && <p className="team-club">{t.club}</p>}
                  <FormDots form={r.form} />
                  <p className="team-hall">
                    <CalendarClock size={14} /> {slotText(t.slots)}
                  </p>
                </TiltCard>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {list.length === 0 && <p className="empty">Keine Mannschaft passt zu „{q}“.</p>}
      </motion.div>
    </div>
  )
}

export function TeamDetail() {
  const { id = '' } = useParams()
  const { matches, toast } = useStore()
  const [tab, setTab] = useState<'kommend' | 'ergebnisse'>('kommend')
  const team = TEAM_BY_ID.get(id)
  const standings = useMemo(() => (team ? computeStandings(team.league, matches) : []), [team, matches])
  if (!team) {
    return (
      <div className="wrap page">
        <PageHead eyebrow="Mannschaften" title="Mannschaft nicht gefunden" />
        <Link to="/mannschaften" className="btn btn-ghost">
          <ArrowLeft size={16} /> Zur Übersicht
        </Link>
      </div>
    )
  }
  const rank = standings.findIndex((r) => r.team.id === team.id)
  const row = standings[rank]
  const own = matches.filter((m) => m.home === team.id || m.away === team.id)
  const upcoming = own.filter((m) => !m.sets && matchDate(m) >= NOW)
  const results = own.filter((m) => m.sets).reverse()
  const list = tab === 'kommend' ? upcoming : results
  const setRatio = row.setsAgainst ? (row.setsFor / row.setsAgainst).toFixed(2).replace('.', ',') : row.setsFor ? '∞' : '–'

  return (
    <div className="wrap page">
      <Link to="/mannschaften" className="back-link">
        <ArrowLeft size={16} /> Alle Mannschaften
      </Link>
      <motion.section className="team-hero" style={{ '--h': team.hue } as React.CSSProperties} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <motion.div initial={{ rotate: -20, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
          <TeamBadge team={team} size={88} />
        </motion.div>
        <div className="team-hero-copy">
          <p className="eyebrow">
            <Link to={`/tabellen/${team.league}`}>Liga {team.league}</Link>{team.club ? ` · ${team.club}` : ''}
          </p>
          <h1>{team.name}</h1>
          <div className="team-kpis">
            <span>
              <Trophy size={16} /> Platz <b>{rank + 1}</b>
            </span>
            <span>
              <b>{row.points}</b> Punkte
            </span>
            <span>
              Satzquotient <b>{setRatio}</b>
            </span>
            <span>
              <CalendarClock size={16} /> {slotText(team.slots)}
            </span>
          </div>
        </div>
      </motion.section>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Spiele</h2>
            <Segmented
              id="team-tab"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'kommend', label: `Kommend (${upcoming.length})` },
                { value: 'ergebnisse', label: `Ergebnisse (${results.length})` },
              ]}
            />
          </div>
          <ul className="match-list">
            {list.length === 0 && <li className="empty">{tab === 'kommend' ? 'Keine offenen Spiele.' : 'Noch keine Ergebnisse.'}</li>}
            {list.map((m) => {
              const isHome = m.home === team.id
              const opp = TEAM_BY_ID.get(isHome ? m.away : m.home)!
              const d = matchDate(m)
              const sw = m.sets ? setsWon(m.sets) : null
              const won = sw ? (isHome ? sw[0] > sw[1] : sw[1] > sw[0]) : null
              return (
                <li key={m.id} className="ml-row">
                  <span className="ml-date">
                    <b>{weekdayOf(d)}</b> {fmtDate(d)}
                  </span>
                  <span className="ml-ha">{isHome ? 'Heim' : 'Gast'}</span>
                  <Link to={`/mannschaften/${opp.id}`} className="ml-opp">
                    <TeamBadge team={opp} size={24} /> {opp.name}
                  </Link>
                  {sw ? (
                    <span className="ml-res">
                      <b className={`result-chip ${won ? 'win' : 'loss'}`}>
                        {won ? 'S' : 'N'} {isHome ? `${sw[0]}:${sw[1]}` : `${sw[1]}:${sw[0]}`}
                      </b>
                      <SetPills sets={m.sets!} perspective={isHome ? 'home' : 'away'} />
                    </span>
                  ) : (
                    <span className="ml-res muted">{m.time} Uhr</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
        <aside className="side-stack">
          <section className="panel">
            <h2 className="panel-title">Training & Heimspiele</h2>
            <ul className="slot-list">
              {team.slots.map((sl, i) => (
                <li key={i}>
                  <b>{WEEKDAYS_LONG[sl.day]}</b>
                  <span className="mono">
                    {sl.from}
                    {sl.to ? `–${sl.to}` : ''} Uhr
                  </span>
                </li>
              ))}
            </ul>
            {team.venues.length ? (
              team.venues.map((v) => (
                <p key={v} className="muted with-icon venue-line">
                  <MapPin size={15} /> {v}
                </p>
              ))
            ) : (
              <p className="muted small">Keine Halle angegeben.</p>
            )}
          </section>
          <section className="panel">
            <h2 className="panel-title">{team.contacts.length > 1 ? 'Ansprechpersonen' : 'Ansprechperson'}</h2>
            <ul className="contact-list">
              {team.contacts.map((c) => (
                <li key={c}>
                  <span className="avatar sm">{c.split(' ').map((p) => p[0]).join('')}</span> {c}
                </li>
              ))}
            </ul>
            <button className="btn btn-ghost btn-sm" onClick={() => toast(`Kontaktanfrage an ${team.contacts[0]} vorbereitet (Demo).`, 'info')}>
              <Mail size={16} /> Kontakt aufnehmen
            </button>
          </section>
          <section className="panel">
            <h2 className="panel-title">Form</h2>
            <FormDots form={row.form} />
            <p className="muted small">
              {row.wins} Siege, {row.losses} Niederlagen, Bälle {row.ballsFor}:{row.ballsAgainst}
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
