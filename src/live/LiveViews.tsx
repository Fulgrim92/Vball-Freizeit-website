import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ExternalLink, Radio, RotateCcw, Trophy, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { burst } from '../lib/burst'
import { fmtDate, matchDate, NOW, TEAM_BY_ID, type Match } from '../data/season'
import { MY_TEAM_ID } from '../data/myteam'
import { TeamBadge } from '../components/ui'
import { derive, feed, setTarget, type LiveGame, type Side } from './engine'
import { useLive } from './LiveProvider'

export function ago(t: number, now: number) {
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 5) return 'gerade eben'
  if (s < 60) return `vor ${s} s`
  if (s < 3600) return `vor ${Math.floor(s / 60)} min`
  return `vor ${Math.floor(s / 3600)} h`
}

const clock = (t: number) => new Date(t).toTimeString().slice(0, 5)

function Num({ value, className }: { value: number | string; className?: string }) {
  return (
    <span className={`lc-num ${className ?? ''}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: -12, opacity: 0, scale: 1.3 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** Scoreboard card for one game on the ticker. */
export function LiveCard({ game, match }: { game: LiveGame; match: Match }) {
  const { now } = useLive()
  const [open, setOpen] = useState(false)
  const st = derive(game.rallies)
  const live = game.status === 'live'
  const events = feed(game, match, now)
  const teams = { home: TEAM_BY_ID.get(match.home)!, away: TEAM_BY_ID.get(match.away)! }
  const status = live ? (st.decided ? 'Entschieden' : `Live · Satz ${st.setIndex + 1}`) : 'Beendet'

  return (
    <motion.article layout className={`live-card${live ? ' is-live' : ' is-final'}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <header className="lc-top">
        <span className={`live-pill${live ? '' : ' off'}`}>
          {live && <i className="live-dot" />} {status}
        </span>
        <Link to={`/tabellen/${match.league}`} className="league-tag">
          L{match.league}
        </Link>
        <span className="lc-venue">{match.venue}</span>
      </header>
      <div className="lc-board" role="table" aria-label={`${teams.home.name} gegen ${teams.away.name}`}>
        <div className="lc-row lc-head" role="row">
          <span role="columnheader">
            <span className="sr-only">Mannschaft</span>
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} role="columnheader" className={i === st.setIndex && live && !st.decided ? 'cur' : ''}>
              S{i + 1}
            </span>
          ))}
          <span role="columnheader">Sätze</span>
        </div>
        {(['home', 'away'] as const).map((side) => {
          const i = side === 'home' ? 0 : 1
          const t = teams[side]
          const leads = st.setsWon[i] > st.setsWon[1 - i]
          return (
            <div key={side} className={`lc-row${st.decided && leads ? ' won' : ''}`} role="row">
              <span role="cell" className="lc-team">
                <TeamBadge team={t} size={28} />
                <Link to={`/mannschaften/${t.id}`}>{t.name}</Link>
                {live && !st.decided && st.serving === side && game.rallies.length > 0 && <i className="serve" title="Aufschlag" aria-label="hat Aufschlag" />}
              </span>
              {[0, 1, 2].map((s) => {
                const done = st.sets[s]
                const isCur = s === st.setIndex && live && !st.decided
                const v = done ? done[i] : isCur ? st.current[i] : null
                return (
                  <span key={s} role="cell" className={`lc-set${isCur ? ' cur' : ''}${done && done[i] > done[1 - i] ? ' w' : ''}`}>
                    {v === null ? '' : isCur ? <Num value={v} /> : v}
                  </span>
                )
              })}
              <span role="cell" className="lc-total">
                <Num value={st.setsWon[i]} />
              </span>
            </div>
          )
        })}
      </div>
      <AnimatePresence>
        {live && st.ballFor && (
          <motion.p className="lc-ball" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {st.ballFor.kind} {teams[st.ballFor.side].name}
          </motion.p>
        )}
      </AnimatePresence>
      {events.length > 0 && (
        <ol className="lc-feed">
          <AnimatePresence initial={false}>
            {events.slice(0, open ? 15 : 3).map((e) => (
              <motion.li key={`${e.t}-${e.kind}`} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className={`ev-${e.kind}`}>
                <time>{clock(e.t)}</time>
                <span>{e.text}</span>
                {e.score && <b>{e.score}</b>}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
      <footer className="lc-foot">
        <span>
          {game.source === 'sim' ? 'Demo-Simulation' : `Gemeldet von ${game.reporter}`} · {ago(game.updatedAt, now)}
        </span>
        {events.length > 3 && (
          <button className="link" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? 'Weniger' : 'Spielverlauf'}
          </button>
        )}
      </footer>
    </motion.article>
  )
}

/** Matches the logged-in team may report: past home games without a result, else the next home game. */
export function useReportable() {
  const { matches } = useStore()
  const { canReport } = useLive()
  return useMemo(() => {
    const open = matches.filter((m) => m.home === MY_TEAM_ID && canReport(m))
    const past = open.filter((m) => matchDate(m) < NOW)
    return past.length ? past : open.slice(0, 1)
  }, [matches, canReport])
}

/** Score entry for the team's own game, built for a phone at the side of the court. */
export function LiveConsole() {
  const { matches, toast, user } = useStore()
  const live = useLive()
  const candidates = useReportable()
  const running = candidates.find((m) => live.game(m.id)?.status === 'live')
  const [picked, setPicked] = useState(candidates[0]?.id ?? '')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [finished, setFinished] = useState<Match | null>(null)
  const finishBtn = useRef<HTMLButtonElement>(null)
  const matchId = running?.id ?? picked
  const match = matches.find((m) => m.id === matchId)

  if (!user?.rights.includes('Ergebnisse')) {
    return (
      <section className="panel">
        <h2>Live melden</h2>
        <p className="muted">Live melden kann nur, wer im Team das Recht „Ergebnisse“ hat. Frag eure Mannschaftsverantwortlichen.</p>
      </section>
    )
  }

  if (finished) {
    const sets = matches.find((m) => m.id === finished.id)?.sets ?? []
    const won = sets.filter(([h, a]) => h > a).length
    return (
      <section className="panel live-console">
        <p className="eyebrow">Ergebnis übernommen</p>
        <h2>
          {TEAM_BY_ID.get(finished.home)!.name} {won}:{sets.length - won} {TEAM_BY_ID.get(finished.away)!.name}
        </h2>
        <p className="muted">Das Ergebnis steht jetzt in Tabelle und Spielplan. Im Live-Ticker bleibt das Spiel als beendet stehen.</p>
        <div className="lv-actions">
          <Link to={`/tabellen/${finished.league}`} className="btn btn-primary">
            <Trophy size={16} /> Zur Tabelle
          </Link>
          <button className="btn btn-ghost" onClick={() => setFinished(null)}>
            Fertig
          </button>
        </div>
      </section>
    )
  }

  if (!match) {
    return (
      <section className="panel">
        <h2>Live melden</h2>
        <p className="muted">Gerade gibt es kein offenes Heimspiel, das ihr live melden könnt.</p>
      </section>
    )
  }

  const opp = TEAM_BY_ID.get(match.away)!
  const me = TEAM_BY_ID.get(match.home)!
  const game = live.game(match.id)
  const isLive = game?.status === 'live'

  if (!isLive) {
    return (
      <section className="panel live-console">
        <div className="panel-head">
          <div>
            <h2>Live melden</h2>
            <p className="muted small">Zählt euer Heimspiel Punkt für Punkt mit. Alle sehen den Stand sofort im Live-Ticker.</p>
          </div>
          {candidates.length > 1 && (
            <select id="live-match" aria-label="Spiel wählen" value={matchId} onChange={(e) => setPicked(e.target.value)}>
              {candidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {fmtDate(matchDate(m))} gegen {TEAM_BY_ID.get(m.away)!.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="lv-matchup">
          <span>
            <TeamBadge team={me} size={40} /> <b>{me.name}</b>
          </span>
          <span className="nm-vs">vs</span>
          <span>
            <TeamBadge team={opp} size={40} /> <b>{opp.name}</b>
          </span>
        </div>
        <p className="muted small">
          Spiel {match.no} · {fmtDate(matchDate(match))}, {match.time} Uhr · {match.venue}
        </p>
        <button
          className="btn btn-primary btn-block lv-go"
          onClick={() => {
            live.start(match.id)
            toast('Ihr seid live. Viel Erfolg!')
          }}
        >
          <Radio size={18} /> Live gehen
        </button>
      </section>
    )
  }

  const st = derive(game.rallies)
  const score = (side: Side) => {
    const before = st
    live.point(match.id, side)
    navigator.vibrate?.(12)
    const after = derive([...game.rallies, { s: side, t: Date.now() }])
    if (after.sets.length > before.sets.length) {
      const s = after.sets[after.sets.length - 1]
      toast(after.decided ? `Spiel entschieden: ${after.setsWon[0]}:${after.setsWon[1]}. Jetzt noch übernehmen.` : `Satz ${after.sets.length} an ${side === 'home' ? me.name : opp.name} (${s[0]}:${s[1]}).`)
    }
  }

  return (
    <section className="panel live-console is-live">
      <div className="lv-top">
        <span className="live-pill">
          <i className="live-dot" /> Live · {st.decided ? 'Entschieden' : `Satz ${st.setIndex + 1} bis ${setTarget(st.setIndex)}`}
        </span>
        <a className="link" href="#/live" target="_blank" rel="noopener">
          Ticker <ExternalLink size={14} />
        </a>
      </div>
      <div className="lv-score" aria-live="polite">
        <div className="lv-side">
          <TeamBadge team={me} size={34} />
          <span className="lv-name">{me.name}</span>
          <small>{st.setsWon[0]} Sätze</small>
        </div>
        <div className="lv-points">
          <Num value={st.decided ? st.setsWon[0] : st.current[0]} />
          <span>:</span>
          <Num value={st.decided ? st.setsWon[1] : st.current[1]} />
        </div>
        <div className="lv-side">
          <TeamBadge team={opp} size={34} />
          <span className="lv-name">{opp.name}</span>
          <small>{st.setsWon[1]} Sätze</small>
        </div>
      </div>
      {st.sets.length > 0 && (
        <p className="lv-sets">
          {st.sets.map(([h, a], i) => (
            <span key={i} className={`set-pill ${h > a ? 'good' : 'bad'}`}>
              {h}:{a}
            </span>
          ))}
        </p>
      )}
      <AnimatePresence>
        {st.ballFor && (
          <motion.p className="lc-ball" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {st.ballFor.kind} {st.ballFor.side === 'home' ? me.name : opp.name}
          </motion.p>
        )}
      </AnimatePresence>
      {st.decided ? (
        <div className="lv-done">
          <p>
            <b>
              {st.setsWon[0] > st.setsWon[1] ? me.name : opp.name} gewinnt {Math.max(...st.setsWon)}:{Math.min(...st.setsWon)}.
            </b>{' '}
            Passt alles? Dann übernehmt das Ergebnis in die Tabelle.
          </p>
          <button
            ref={finishBtn}
            autoFocus
            className="btn btn-primary btn-block"
            onClick={() => {
              if (live.finish(match.id)) {
                burst(finishBtn.current, 30)
                toast('Ergebnis gespeichert. Die Tabelle ist aktualisiert.')
                setFinished(match)
              }
            }}
          >
            <Check size={18} /> Ergebnis übernehmen
          </button>
        </div>
      ) : (
        <div className="lv-pad">
          <motion.button whileTap={{ scale: 0.95 }} className="lv-btn home" onClick={() => score('home')} aria-label={`Punkt für ${me.name}`}>
            <b>+1</b>
            <span>{me.name}</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} className="lv-btn away" onClick={() => score('away')} aria-label={`Punkt für ${opp.name}`}>
            <b>+1</b>
            <span>{opp.name}</span>
          </motion.button>
        </div>
      )}
      <div className="lv-actions">
        <button className="btn btn-ghost" disabled={!game.rallies.length} onClick={() => live.undo(match.id)}>
          <RotateCcw size={16} /> Letzten Punkt zurück
        </button>
        {confirmCancel ? (
          <span className="lv-confirm">
            Live-Meldung wirklich verwerfen?
            <button
              className="btn btn-sm btn-ghost danger"
              onClick={() => {
                live.cancel(match.id)
                setConfirmCancel(false)
                toast('Live-Meldung verworfen.', 'info')
              }}
            >
              Verwerfen
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setConfirmCancel(false)}>
              Nein
            </button>
          </span>
        ) : (
          <button className="btn btn-ghost" onClick={() => setConfirmCancel(true)}>
            <X size={16} /> Abbrechen
          </button>
        )}
      </div>
    </section>
  )
}
