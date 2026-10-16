import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CircleHelp, Clock, Lock, LogIn, MapPin, Minus, Plus, Send, ShieldCheck, Target, UserPlus, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { burst } from '../lib/burst'
import { computeStandings, fmtDate, matchDate, NOW, setsWon, TEAM_BY_ID, WEEKDAYS_LONG, weekdayOf, type Match, type SetScore } from '../data/season'
import { ALL_RIGHTS, MIN_PLAYERS, type Right, type Rsvp, type Session } from '../data/myteam'
import { CountUp, FormDots, Segmented, TeamBadge } from '../components/ui'
import { LiveConsole } from '../live/LiveViews'

const initials = (n: string) => n.split(' ').map((p) => p[0]).join('')

function useMe() {
  return useStore().user!
}

/** The logged-in team; MyTeam only renders its tabs once there is one. */
function useTeam() {
  const team = useStore().team!
  return { ...team, team: TEAM_BY_ID.get(team.id)! }
}

function useRsvp() {
  const { myRsvp } = useStore()
  const { squad, answers } = useTeam()
  const me = useMe()
  return (s: Session) => {
    const all = { ...answers[s.id], [me.id]: myRsvp[s.id] }
    const yes = squad.filter((p) => all[p.id] === 'ja')
    const maybe = squad.filter((p) => all[p.id] === 'vielleicht')
    const no = squad.filter((p) => all[p.id] === 'nein')
    return { all, yes, maybe, no, mine: myRsvp[s.id] }
  }
}

function RsvpButtons({ session, compact }: { session: Session; compact?: boolean }) {
  const { myRsvp, setMyRsvp, toast } = useStore()
  const ref = useRef<HTMLDivElement>(null)
  const v = myRsvp[session.id]
  const opts: { value: Rsvp; label: string; icon: typeof Check }[] = [
    { value: 'ja', label: 'Dabei', icon: Check },
    { value: 'vielleicht', label: 'Vielleicht', icon: CircleHelp },
    { value: 'nein', label: 'Absage', icon: X },
  ]
  return (
    <div ref={ref} className={`rsvp${compact ? ' compact' : ''}`} role="group" aria-label="Deine Antwort">
      {opts.map((o) => (
        <motion.button
          key={o.value}
          whileTap={{ scale: 0.92 }}
          className={`rsvp-btn r-${o.value}${v === o.value ? ' on' : ''}`}
          aria-pressed={v === o.value}
          onClick={(e) => {
            setMyRsvp(session.id, o.value)
            if (o.value === 'ja' && v !== 'ja') burst(e.currentTarget, 16)
            if (v !== o.value) toast(o.value === 'ja' ? `Zugesagt für ${weekdayOf(session.date)} ${fmtDate(session.date)}.` : o.value === 'nein' ? 'Abgesagt. Danke fürs Bescheidgeben!' : 'Als „vielleicht“ eingetragen.', o.value === 'ja' ? 'ok' : 'info')
          }}
        >
          <o.icon size={16} />
          {!compact && <span>{o.label}</span>}
        </motion.button>
      ))}
    </div>
  )
}

function Countdown({ to }: { to: Date }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const diff = Math.max(0, +to - +now)
  const parts = [
    [Math.floor(diff / 86400000), 'Tage'],
    [Math.floor(diff / 3600000) % 24, 'Std'],
    [Math.floor(diff / 60000) % 60, 'Min'],
    [Math.floor(diff / 1000) % 60, 'Sek'],
  ] as const
  return (
    <div className="countdown">
      {parts.map(([n, l]) => (
        <span key={l} className="cd-cell">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.b key={n} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }} transition={{ duration: 0.25 }}>
              {String(n).padStart(2, '0')}
            </motion.b>
          </AnimatePresence>
          <small>{l}</small>
        </span>
      ))}
    </div>
  )
}

function Ring({ value, label, size = 120 }: { value: number; label: string; size?: number }) {
  const r = size / 2 - 9
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-val"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value) }}
          transition={{ type: 'spring', stiffness: 50, damping: 16, delay: 0.2 }}
        />
      </svg>
      <span className="ring-label">
        <CountUp value={value * 100} suffix=" %" />
        <small>{label}</small>
      </span>
    </div>
  )
}

function SessionCard({ s, index }: { s: Session; index: number }) {
  const get = useRsvp()
  const me = useMe()
  const { squad } = useTeam()
  const { yes, maybe, no } = get(s)
  const enough = yes.length >= MIN_PLAYERS
  return (
    <motion.article className="session" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} layout>
      <div className="session-top">
        <span className="session-date">
          <b>{weekdayOf(s.date)}</b>
          <span>{fmtDate(s.date).slice(0, 6)}</span>
        </span>
        <div className="session-info">
          <h3>{s.focus || 'Training'}</h3>
          <p className="muted with-icon">
            <Clock size={14} /> {s.date.toTimeString().slice(0, 5)}–{s.end} <MapPin size={14} /> {s.venue}
          </p>
        </div>
        <span className={`quorum ${enough ? 'ok' : 'warn'}`}>{enough ? 'Findet statt' : `Noch ${MIN_PLAYERS - yes.length} nötig`}</span>
      </div>
      <div className="session-bar" aria-label={`${yes.length} Zusagen, ${maybe.length} vielleicht, ${no.length} Absagen`}>
        <motion.i className="b-yes" layout style={{ flexGrow: yes.length }} />
        <motion.i className="b-maybe" layout style={{ flexGrow: maybe.length }} />
        <motion.i className="b-open" layout style={{ flexGrow: squad.length - yes.length - maybe.length - no.length }} />
        <motion.i className="b-no" layout style={{ flexGrow: no.length }} />
        <span className="quorum-mark" style={{ left: `${Math.min(1, MIN_PLAYERS / squad.length) * 100}%` }} title="Mindestens 6" />
      </div>
      <div className="session-bottom">
        <div className="faces">
          <AnimatePresence initial={false}>
            {yes.map((p) => (
              <motion.span key={p.id} layout initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className={p.id === me.id ? 'me' : ''} title={p.name}>
                {initials(p.name)}
              </motion.span>
            ))}
          </AnimatePresence>
          <small className="muted">
            {yes.length} dabei · {maybe.length} vielleicht · {no.length} Absagen
          </small>
        </div>
        <RsvpButtons session={s} />
      </div>
    </motion.article>
  )
}

function AttendanceMatrix() {
  const me = useMe()
  const { squad, past, attendance } = useTeam()
  if (past.length < 2) return null
  const rows = squad.map((p) => {
    const a = attendance[p.id]
    return { p, a, rate: a.filter(Boolean).length / a.length }
  }).sort((x, y) => y.rate - x.rate)
  const perSession = past.map((_, i) => squad.filter((p) => attendance[p.id][i]).length)
  const max = squad.length
  const days = [...new Set(past.map((s) => WEEKDAYS_LONG[(s.date.getDay() + 6) % 7].toLowerCase() + 's'))].join(' und ')
  const w = 100
  const h = 34
  const pts = perSession.map((n, i) => [(i / (perSession.length - 1)) * w, h - (n / max) * (h - 4) - 2] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Trainingsbeteiligung</h2>
          <p className="muted small">
            Letzte {past.length} Einheiten, {days}
          </p>
        </div>
        <div className="spark" aria-label="Teilnehmende pro Einheit">
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
            <line x1="0" x2={w} y1={h - (MIN_PLAYERS / max) * (h - 4) - 2} y2={h - (MIN_PLAYERS / max) * (h - 4) - 2} className="spark-min" />
            <path d={`${line} L${w},${h} L0,${h} Z`} className="spark-area" />
            <motion.path d={line} className="spark-line" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }} />
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" className="spark-end" />
          </svg>
          <small>
            zuletzt <b>{perSession[perSession.length - 1]}</b> Leute
          </small>
        </div>
      </div>
      <div className="matrix-scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th>Person</th>
              {past.map((s) => (
                <th key={s.id} title={fmtDate(s.date)}>
                  <span className="mx-day">{weekdayOf(s.date)}</span>
                </th>
              ))}
              <th className="mx-rate">Quote</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, a, rate }, ri) => (
              <tr key={p.id} className={p.id === me.id ? 'me' : ''}>
                <th>
                  <span className="mx-num">{p.number}</span> {p.name}
                </th>
                {a.map((v, i) => (
                  <td key={i}>
                    <motion.i className={v ? 'on' : ''} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: ri * 0.03 + i * 0.012, type: 'spring', stiffness: 500, damping: 25 }} title={`${fmtDate(past[i].date)}: ${v ? 'da' : 'nicht da'}`} />
                  </td>
                ))}
                <td className="mx-rate">
                  <span className={`rate ${rate >= 0.75 ? 'good' : rate >= 0.55 ? 'mid' : 'low'}`}>{Math.round(rate * 100)} %</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function validateSet(s: SetScore, idx: number): string | null {
  const target = idx === 2 ? 15 : 25
  const [a, b] = s
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  if (hi < target) return `Satz ${idx + 1} geht bis ${target}.`
  if (hi - lo < 2) return `Satz ${idx + 1} braucht zwei Punkte Vorsprung.`
  if (hi > target && hi - lo !== 2) return `Satz ${idx + 1}: Über ${target} endet der Satz bei genau zwei Punkten Abstand.`
  return null
}

function ScoreStepper({ value, onChange, id, label }: { value: number; onChange: (n: number) => void; id: string; label: string }) {
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`${label} minus eins`}>
        <Minus size={14} />
      </button>
      <input id={id} inputMode="numeric" aria-label={label} value={value} onChange={(e) => onChange(Math.max(0, Math.min(60, Number(e.target.value.replace(/\D/g, '')) || 0)))} />
      <button type="button" onClick={() => onChange(Math.min(60, value + 1))} aria-label={`${label} plus eins`}>
        <Plus size={14} />
      </button>
    </span>
  )
}

function NoRight({ title, right }: { title: string; right: Right }) {
  return (
    <section className="panel locked-panel">
      <Lock size={22} />
      <h2 className="panel-title">{title}</h2>
      <p className="muted">
        Dafür brauchst du das Recht „{right}“. Bitte deine Mannschaftsverantwortliche, es dir unter „Kader & Rechte“ zu geben.
      </p>
      {useStore().backend === 'demo' && <p className="muted small">Demo-Tipp: Melde dich als „demo“ an, gib der Spielerin das Recht und wechsle zurück.</p>}
    </section>
  )
}

function ResultEntry() {
  const { can } = useStore()
  if (!can('Ergebnisse')) return <NoRight title="Ergebnis eintragen" right="Ergebnisse" />
  return <ResultForm />
}

function ResultForm() {
  const { matches, enterResult, toast, backend } = useStore()
  const { id: MY_TEAM_ID, team: MY_TEAM } = useTeam()
  const candidates = useMemo(() => {
    const home = matches.filter((m) => m.home === MY_TEAM_ID && !m.sets)
    const past = home.filter((m) => matchDate(m) < new Date())
    // the demo lends you the next home game to try it out; the database only takes played games
    return past.length || backend !== 'demo' ? past : home.slice(0, 1)
  }, [matches, MY_TEAM_ID, backend])
  const [matchId, setMatchId] = useState(candidates[0]?.id ?? '')
  const [sets, setSets] = useState<SetScore[]>([
    [25, 21],
    [22, 25],
    [15, 12],
  ])
  const btn = useRef<HTMLButtonElement>(null)
  const match = matches.find((m) => m.id === matchId) as Match | undefined

  if (!match) {
    return (
      <section className="panel">
        <h2>Ergebnis eintragen</h2>
        <p className="muted">Alle Heimspiele sind eingetragen. Stark!</p>
      </section>
    )
  }
  const opp = TEAM_BY_ID.get(match.away)!
  const first2 = sets.slice(0, 2)
  const sw = setsWon(first2)
  const needThird = sw[0] === 1 && sw[1] === 1
  const used = needThird ? sets : first2
  const errors = used.map(validateSet).filter(Boolean) as string[]
  const final = setsWon(used)
  const valid = errors.length === 0
  const before = computeStandings(MY_TEAM.league, matches).findIndex((r) => r.team.id === MY_TEAM_ID) + 1
  const after = valid ? computeStandings(MY_TEAM.league, matches.map((m) => (m.id === match.id ? { ...m, sets: used } : m))).findIndex((r) => r.team.id === MY_TEAM_ID) + 1 : before
  const preview = matchDate(match) > NOW

  return (
    <section className="panel result-panel">
      <div className="panel-head">
        <div>
          <h2>Ergebnis eintragen</h2>
          <p className="muted small">Du hast das Recht „Ergebnisse“ und darfst Heimspiele von {MY_TEAM.name} eintragen.</p>
        </div>
        {candidates.length > 1 && (
          <select id="result-match" value={matchId} onChange={(e) => setMatchId(e.target.value)}>
            {candidates.map((m) => (
              <option key={m.id} value={m.id}>
                Spiel {m.no} · {fmtDate(matchDate(m))}
              </option>
            ))}
          </select>
        )}
      </div>
      {preview && <p className="note">Noch kein Heimspiel offen. Zum Ausprobieren nutzt die Demo euer nächstes Heimspiel.</p>}
      <form
        className="score-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          enterResult(match.id, used)
          burst(btn.current, 30)
          toast(`Ergebnis ${final[0]}:${final[1]} gespeichert. Tabelle, Ticker und „Was geschah“ sind aktualisiert.`)
        }}
      >
        <div className="score-head">
          <span>
            <TeamBadge team={MY_TEAM} size={30} /> {MY_TEAM.name}
          </span>
          <motion.b key={`${final[0]}-${final[1]}`} className="score-big" initial={{ scale: 1.25 }} animate={{ scale: 1 }}>
            {final[0]}:{final[1]}
          </motion.b>
          <span className="right">
            {opp.name} <TeamBadge team={opp} size={30} />
          </span>
        </div>
        {sets.map((s, i) => (
          <motion.div key={i} className={`set-row${i === 2 && !needThird ? ' disabled' : ''}`} animate={{ opacity: i === 2 && !needThird ? 0.4 : 1 }}>
            <span className="set-label">
              Satz {i + 1}
              <small>bis {i === 2 ? 15 : 25}</small>
            </span>
            <ScoreStepper id={`set${i}-h`} label={`Satz ${i + 1} ${MY_TEAM.name}`} value={s[0]} onChange={(n) => setSets((all) => all.map((x, j) => (j === i ? [n, x[1]] : x)))} />
            <span className="colon">:</span>
            <ScoreStepper id={`set${i}-a`} label={`Satz ${i + 1} ${opp.name}`} value={s[1]} onChange={(n) => setSets((all) => all.map((x, j) => (j === i ? [x[0], n] : x)))} />
          </motion.div>
        ))}
        {!needThird && <p className="muted small">Nach 2:0 entfällt der Entscheidungssatz.</p>}
        <AnimatePresence>
          {errors.length > 0 && (
            <motion.p className="form-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {errors[0]}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="score-foot">
          <span className="impact">
            {valid && (after < before ? `Damit springt ihr von Platz ${before} auf Platz ${after}.` : after > before ? `Damit rutscht ihr von Platz ${before} auf ${after}.` : `Ihr bleibt auf Platz ${before}.`)}
          </span>
          <button ref={btn} className="btn btn-primary" disabled={!valid}>
            <Send size={16} /> Ergebnis speichern
          </button>
        </div>
      </form>
    </section>
  )
}

function Reschedule() {
  const { can } = useStore()
  if (!can('Spielverlegung')) return <NoRight title="Heimspiel verlegen" right="Spielverlegung" />
  return <RescheduleForm />
}

function RescheduleForm() {
  const { matches, toast, requestMove, backend } = useStore()
  const { id: MY_TEAM_ID } = useTeam()
  const [busy, setBusy] = useState(false)
  const home = matches.filter((m) => m.home === MY_TEAM_ID && !m.sets && matchDate(m) > NOW)
  const [id, setId] = useState(home[0]?.id ?? '')
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  if (!home.length) return null
  return (
    <section className="panel">
      <h2 className="panel-title">Heimspiel verlegen</h2>
      <p className="muted small">Pro Saison sind zwei Verlegungen erlaubt. Stimmt den Termin vorher mit dem Gegner ab.</p>
      <form
        className="stack-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!date) return toast('Bitte einen neuen Termin wählen.', 'info')
          setBusy(true)
          const err = await requestMove(id, new Date(date), reason)
          setBusy(false)
          if (err) return toast(err, 'info')
          toast(backend === 'demo' ? 'Verlegungsantrag an die Staffelleitung geschickt (Demo).' : 'Verlegungsantrag an die Staffelleitung geschickt.')
          setDate('')
          setReason('')
        }}
      >
        <label htmlFor="rs-match">Spiel</label>
        <select id="rs-match" value={id} onChange={(e) => setId(e.target.value)}>
          {home.map((m) => (
            <option key={m.id} value={m.id}>
              {fmtDate(matchDate(m))} gegen {TEAM_BY_ID.get(m.away)!.name}
            </option>
          ))}
        </select>
        <label htmlFor="rs-date">Neuer Termin</label>
        <input id="rs-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        <label htmlFor="rs-reason">Grund (optional)</label>
        <input id="rs-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="z. B. Halle belegt" />
        <button className="btn btn-ghost" disabled={busy}>
          Antrag senden
        </button>
      </form>
    </section>
  )
}

const inviteLink = (code: string) => `${window.location.origin}${window.location.pathname}#/mein-team?einladung=${code}`

function InviteButton() {
  const { createInvite, toast } = useStore()
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (code) {
    return (
      <p className="muted small">
        Einladungscode <b>{code}</b>, 14 Tage gültig
      </p>
    )
  }
  return (
    <button
      className="btn btn-ghost btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        const res = await createInvite()
        setBusy(false)
        if (!res.code) return toast(res.error ?? 'Der Code konnte nicht erstellt werden.', 'info')
        setCode(res.code)
        try {
          await navigator.clipboard.writeText(inviteLink(res.code))
          toast('Einladungslink kopiert. Schick ihn an die neue Person im Team.')
        } catch {
          toast('Einladungscode erstellt.')
        }
      }}
    >
      <UserPlus size={16} /> Einladen
    </button>
  )
}

/** Signed in, but not in a team yet: redeem the code from an invite link. */
function JoinTeam() {
  const { joinTeam, toast, user } = useStore()
  const loc = useLocation()
  const [code, setCode] = useState(() => new URLSearchParams(loc.search).get('einladung') ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className="wrap page">
      <section className="panel">
        <p className="eyebrow">Mein Team</p>
        <h1>Servus, {user!.name.split(' ')[0]}.</h1>
        <p className="muted">Dein Konto ist noch keiner Mannschaft zugeordnet. Gib den Einladungscode ein, den du von deinem Team bekommen hast.</p>
        <form
          className="stack-form"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!code.trim()) return setError('Bitte den Einladungscode eingeben.')
            setBusy(true)
            setError('')
            const err = await joinTeam(code)
            setBusy(false)
            if (err) setError(err)
            else toast('Willkommen im Team!')
          }}
        >
          <label htmlFor="join-code">Einladungscode</label>
          <input id="join-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary" disabled={busy}>
            <LogIn size={16} /> Beitreten
          </button>
        </form>
        <p className="muted small">Euer Team ist noch gar nicht angemeldet? Die Staffelleitung richtet das erste Konto ein.</p>
      </section>
    </div>
  )
}

function Squad() {
  const { toast, rights, setRights, can, backend } = useStore()
  const me = useMe()
  const { squad } = useTeam()
  const canGrant = can('Rechte vergeben')
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Kader & Rechte</h2>
          <p className="muted small">
            {canGrant
              ? 'Du kannst Rechte weitergeben, die du selbst hast. Ämter sind davon getrennt.'
              : 'Rechte vergeben darf nur, wer selbst das Recht „Rechte vergeben“ hat.'}
          </p>
        </div>
        {canGrant && backend === 'supabase' && <InviteButton />}
      </div>
      <ul className="squad">
        {squad.map((p, i) => (
          <motion.li key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className={p.id === me.id ? 'me' : ''}>
            <span className="jersey">{p.number}</span>
            <span className="squad-name">
              <b>
                {p.name}
                {p.id === me.id ? ' (du)' : ''}
              </b>
              <small>
                {p.position}
                {p.office ? ` · ${p.office}` : ''}
              </small>
            </span>
            <span className="rights">
              {ALL_RIGHTS.map((r: Right) => {
                const has = rights[p.id] ?? []
                const on = has.includes(r)
                const locked = p.id === me.id || !canGrant || !me.rights.includes(r)
                return (
                  <button
                    key={r}
                    className={`right-chip${on ? ' on' : ''}`}
                    disabled={locked}
                    aria-pressed={on}
                    onClick={() => {
                      setRights(p.id, on ? has.filter((x) => x !== r) : [...has, r])
                      toast(on ? `${p.name.split(' ')[0]} darf „${r}“ nicht mehr.` : `${p.name.split(' ')[0]} darf jetzt „${r}“.`, 'info')
                    }}
                  >
                    {on && <ShieldCheck size={12} />} {r}
                  </button>
                )
              })}
            </span>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}

function Overview({ go }: { go: (t: Tab) => void }) {
  const { matches } = useStore()
  const me = useMe()
  const get = useRsvp()
  const { id: MY_TEAM_ID, team: MY_TEAM, squad, past, next: NEXT_SESSIONS, attendance } = useTeam()
  const next = matches.find((m) => (m.home === MY_TEAM_ID || m.away === MY_TEAM_ID) && !m.sets && matchDate(m) > NOW)
  const standings = computeStandings(MY_TEAM.league, matches)
  const pos = standings.findIndex((r) => r.team.id === MY_TEAM_ID)
  const around = standings.slice(Math.max(0, pos - 2), Math.max(0, pos - 2) + 5)
  const teamRate = squad.reduce((n, p) => n + attendance[p.id].filter(Boolean).length, 0) / (squad.length * past.length) || 0
  const myRate = (attendance[me.id]?.filter(Boolean).length ?? 0) / past.length || 0
  const nextSession = NEXT_SESSIONS[0]
  const open = NEXT_SESSIONS.filter((s) => !get(s).mine).length

  return (
    <div className="dash-grid">
      {next && (
        <section className="panel next-match">
          <p className="eyebrow">Nächstes Spiel · {next.home === MY_TEAM_ID ? 'Heim' : 'Auswärts'}</p>
          <div className="nm-teams">
            <TeamBadge team={TEAM_BY_ID.get(next.home)!} size={52} />
            <span className="nm-vs">vs</span>
            <TeamBadge team={TEAM_BY_ID.get(next.away)!} size={52} />
          </div>
          <h2>
            {TEAM_BY_ID.get(next.home)!.name} – {TEAM_BY_ID.get(next.away)!.name}
          </h2>
          <p className="muted with-icon">
            <Clock size={14} /> {weekdayOf(matchDate(next))} {fmtDate(matchDate(next))}, {next.time} Uhr <MapPin size={14} /> {next.venue}
          </p>
          <Countdown to={matchDate(next)} />
        </section>
      )}
      {nextSession && (
        <section className="panel next-training">
          <p className="eyebrow">Nächstes Training</p>
          <h2>
            {weekdayOf(nextSession.date)} {nextSession.date.toTimeString().slice(0, 5)}
            {nextSession.focus && ` · ${nextSession.focus}`}
          </h2>
          <p className="muted small">
            {get(nextSession).yes.length} Zusagen, mindestens {MIN_PLAYERS} nötig
          </p>
          <RsvpButtons session={nextSession} />
          {open > 0 && (
            <button className="link" onClick={() => go('training')}>
              Noch {open} {open === 1 ? 'Einheit' : 'Einheiten'} ohne deine Antwort
            </button>
          )}
        </section>
      )}
      <section className="panel rings-panel">
        <p className="eyebrow">Trainingsbeteiligung</p>
        <div className="rings">
          <Ring value={myRate} label="du" />
          <Ring value={teamRate} label="Team" />
        </div>
        <button className="link" onClick={() => go('training')}>
          Alle Einheiten ansehen
        </button>
      </section>
      <section className="panel mini-table">
        <div className="panel-head">
          <p className="eyebrow">Liga {MY_TEAM.league}</p>
          <Link to={`/tabellen/${MY_TEAM.league}`} className="link">
            Ganze Tabelle
          </Link>
        </div>
        <ol>
          {around.map((r) => {
            const i = standings.indexOf(r)
            return (
              <motion.li key={r.team.id} layout className={r.team.id === MY_TEAM_ID ? 'me' : ''}>
                <span className="pos">{i + 1}</span>
                <TeamBadge team={r.team} size={24} />
                <span className="mt-name">{r.team.name}</span>
                <FormDots form={r.form} />
                <b>{r.points}</b>
              </motion.li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}

type Tab = 'uebersicht' | 'training' | 'live' | 'ergebnis' | 'kader'

export default function MyTeam() {
  const { user, team, authReady } = useStore()
  const loc = useLocation()
  const [tab, setTab] = useState<Tab>(() => (loc.state as { tab?: Tab } | null)?.tab ?? 'uebersicht')
  if (!authReady) return <div className="wrap page" aria-busy="true" />
  if (!user) return <Navigate to="/login" state={{ from: '/mein-team' + loc.search }} replace />
  if (!team) return <JoinTeam />
  return <Dashboard tab={tab} setTab={setTab} />
}

function Dashboard({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const user = useMe()
  const { team: MY_TEAM, next: NEXT_SESSIONS } = useTeam()
  const hour = new Date().getHours()
  const hello = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Servus' : 'Guten Abend'

  return (
    <div className="wrap page">
      <header className="dash-head">
        <div>
          <p className="eyebrow">
            Mein Team · {MY_TEAM.name} · Liga {MY_TEAM.league}
          </p>
          <h1>
            {hello}, {user.name.split(' ')[0]}.
          </h1>
        </div>
        <span className="role-pill">
          <Target size={14} /> {user.office ?? 'Spielerin'}
        </span>
      </header>
      <div className="dash-tabs">
        <Segmented
          id="dash"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'uebersicht', label: 'Übersicht' },
            { value: 'training', label: 'Training' },
            { value: 'live', label: 'Live' },
            { value: 'ergebnis', label: 'Ergebnisse' },
            { value: 'kader', label: 'Kader & Rechte' },
          ]}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          {tab === 'uebersicht' && <Overview go={setTab} />}
          {tab === 'training' && (
            <div className="training-layout">
              <div className="sessions">
                {NEXT_SESSIONS.map((s, i) => (
                  <SessionCard key={s.id} s={s} index={i} />
                ))}
              </div>
              <AttendanceMatrix />
            </div>
          )}
          {tab === 'live' && (
            <div className="live-console-wrap">
              <LiveConsole />
            </div>
          )}
          {tab === 'ergebnis' && (
            <div className="detail-grid">
              <ResultEntry />
              <aside className="side-stack">
                <Reschedule />
              </aside>
            </div>
          )}
          {tab === 'kader' && <Squad />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
