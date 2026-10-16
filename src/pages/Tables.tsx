import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react'
import { useStore } from '../lib/store'
import { computeStandings, fmtDate, LEAGUES, matchDate, NOW, SEASON, setsWon, teamsOf, TEAM_BY_ID, weekdayOf } from '../data/season'
import { FormDots, PageHead, Segmented, SetPills, TeamLink } from '../components/ui'

function LeaguePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="league-picker" role="tablist" aria-label="Liga wählen">
      {[1, 2, 3, 4, 5].map((tier) => (
        <div key={tier} className="lp-tier">
          {LEAGUES.filter((l) => l.tier === tier).map((l) => (
            <button key={l.id} role="tab" aria-selected={l.id === value} className={`lp-btn${l.id === value ? ' on' : ''}`} onClick={() => onChange(l.id)}>
              {l.id === value && <motion.span layoutId="lp-ind" className="lp-ind" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
              <span>{l.id}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function Tables() {
  const { league = '1' } = useParams()
  const nav = useNavigate()
  const { matches } = useStore()
  const [hover, setHover] = useState<string | null>(null)
  const [view, setView] = useState<'kommend' | 'ergebnisse' | 'alle'>('kommend')
  const [teamFilter, setTeamFilter] = useState('')

  const valid = LEAGUES.some((l) => l.id === league) ? league : '1'
  const tier = Number(valid[0])
  const rows = useMemo(() => computeStandings(valid, matches), [valid, matches])
  const maxPts = Math.max(2, ...rows.map((r) => r.points))
  const leagueMatches = matches.filter((m) => m.league === valid)
  const shown = leagueMatches
    .filter((m) => (view === 'kommend' ? !m.sets && matchDate(m) >= NOW : view === 'ergebnisse' ? !!m.sets : true))
    .filter((m) => !teamFilter || m.home === teamFilter || m.away === teamFilter)
  const list = view === 'ergebnisse' ? shown.slice().reverse() : shown

  const zone = (i: number) => {
    if (tier > 1 && i < 1) return 'up'
    if (tier < 5 && i >= rows.length - 2) return 'down'
    return ''
  }

  return (
    <div className="wrap page">
      <PageHead eyebrow={`Spielplan & Tabelle ${SEASON} · Staffelleitung ${LEAGUES.find((l) => l.id === valid)!.lead}`} title={<>Liga {valid}</>}>
        <LeaguePicker
          value={valid}
          onChange={(id) => {
            setTeamFilter('')
            nav(`/tabellen/${id}`)
          }}
        />
      </PageHead>

      <div className="tables-grid">
        <section className="panel table-panel" aria-label="Tabelle">
          <div className="panel-head">
            <h2>Tabelle</h2>
            <span className="legend">
              {tier > 1 && (
                <span className="lg up">
                  <ArrowUpRight size={14} /> Aufstieg
                </span>
              )}
              {tier < 5 && (
                <span className="lg down">
                  <ArrowDownRight size={14} /> Abstieg
                </span>
              )}
            </span>
          </div>
          <div className="table-scroll">
            <table className="standings">
              <thead>
                <tr>
                  <th className="c-pos">#</th>
                  <th className="c-team">Mannschaft</th>
                  <th title="Spiele">Sp</th>
                  <th title="Siege">S</th>
                  <th title="Niederlagen">N</th>
                  <th>Sätze</th>
                  <th className="hide-sm">Bälle</th>
                  <th className="hide-sm">Form</th>
                  <th className="c-pts">Punkte</th>
                </tr>
              </thead>
              <LayoutGroup id={valid}>
                <tbody>
                  <AnimatePresence initial={false}>
                    {rows.map((r, i) => (
                      <motion.tr
                        key={r.team.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
                        exit={{ opacity: 0 }}
                        className={`${zone(i)}${hover === r.team.id ? ' hl' : ''}`}
                        onMouseEnter={() => setHover(r.team.id)}
                        onMouseLeave={() => setHover(null)}
                      >
                        <td className="c-pos">
                          <span className="pos">{i + 1}</span>
                        </td>
                        <td className="c-team">
                          <TeamLink id={r.team.id} />
                        </td>
                        <td>{r.played}</td>
                        <td>{r.wins}</td>
                        <td>{r.losses}</td>
                        <td className="mono">
                          {r.setsFor}:{r.setsAgainst}
                        </td>
                        <td className="mono hide-sm">
                          {r.ballsFor}:{r.ballsAgainst}
                        </td>
                        <td className="hide-sm">
                          <FormDots form={r.form} />
                        </td>
                        <td className="c-pts">
                          <span className="pts-bar">
                            <motion.i initial={{ width: 0 }} animate={{ width: `${(r.points / maxPts) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.1 + i * 0.03 }} />
                          </span>
                          <b>{r.points}</b>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </LayoutGroup>
            </table>
          </div>
          <p className="footnote">
            <Info size={14} /> Sieg 2 Punkte, Niederlage 1:2 bringt 1 Punkt. Bei Gleichstand zählt der Satz-, dann der Ballquotient.
          </p>
        </section>

        <section className="panel schedule-panel" aria-label="Spielplan">
          <div className="panel-head">
            <h2>Spielplan</h2>
            <Segmented
              id="sched"
              value={view}
              onChange={setView}
              options={[
                { value: 'kommend', label: 'Kommend' },
                { value: 'ergebnisse', label: 'Ergebnisse' },
                { value: 'alle', label: 'Alle' },
              ]}
            />
          </div>
          <label className="select-wrap">
            <span className="sr-only">Mannschaft filtern</span>
            <select id="team-filter" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
              <option value="">Alle Mannschaften</option>
              {teamsOf(valid).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <ol className="schedule">
            <AnimatePresence initial={false} mode="popLayout">
              {list.length === 0 && (
                <motion.li key="empty" className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {view === 'ergebnisse' ? 'Noch keine Ergebnisse.' : 'Keine offenen Spiele.'}
                </motion.li>
              )}
              {list.map((m) => {
                const d = matchDate(m)
                const sw = m.sets ? setsWon(m.sets) : null
                const involved = hover && (m.home === hover || m.away === hover)
                return (
                  <motion.li
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className={`sched-row${involved ? ' hl' : ''}${hover && !involved ? ' dim' : ''}`}
                  >
                    <span className="sched-no">{m.no}</span>
                    <span className="sched-date">
                      <b>
                        {weekdayOf(d)} {fmtDate(d)}
                      </b>
                      <small>{m.time} Uhr</small>
                    </span>
                    <span className="sched-teams">
                      <span className={sw && sw[0] > sw[1] ? 'won' : ''}>{TEAM_BY_ID.get(m.home)!.name}</span>
                      <span className={sw && sw[1] > sw[0] ? 'won' : ''}>{TEAM_BY_ID.get(m.away)!.name}</span>
                    </span>
                    <span className="sched-res">
                      {sw ? (
                        <>
                          <b className="score">
                            {sw[0]}:{sw[1]}
                          </b>
                          <SetPills sets={m.sets!} />
                        </>
                      ) : (
                        <span className="open-tag">{m.venue}</span>
                      )}
                    </span>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ol>
        </section>
      </div>
    </div>
  )
}
