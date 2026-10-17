import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { MATCHES, matchDate, NOW, type Match, type SetScore } from '../data/season'
import { MY_TEAM_ID } from '../data/myteam'
import { remote } from '../backend'
import { addPoint, derive, finalSets, simAt, simulateGame, undoPoint, type LiveGame, type Side } from './engine'
import { createLocalTransport, type LiveSnapshot } from './transport'

interface Live {
  /** every game to show, live ones first */
  games: LiveGame[]
  /** simulated games that have not started yet */
  upcoming: LiveGame[]
  game: (matchId: string) => LiveGame | undefined
  now: number
  canReport: (match: Match) => boolean
  /** the reporter's decided games whose result is not uploaded yet */
  proposals: Proposal[]
  start: (matchId: string) => void
  point: (matchId: string, side: Side) => void
  undo: (matchId: string) => void
  finish: (matchId: string) => SetScore[] | null
  cancel: (matchId: string) => void
}

export interface Proposal {
  game: LiveGame
  match: Match
  sets: SetScore[]
}

const Ctx = createContext<Live | null>(null)

const transport = remote ? remote.createSupabaseTransport() : createLocalTransport()
const DAY = 24 * 3600 * 1000

// Demo games run in a 40 minute loop, shared by all tabs through a stored start time.
const LOOP = 40 * 60 * 1000
const OFFSETS = [-7 * 60 * 1000, -150 * 1000, 90 * 1000]

function simEpoch() {
  const now = Date.now()
  try {
    const stored = Number(localStorage.getItem('vfm:live-epoch'))
    if (stored && now - stored < LOOP) return stored
    localStorage.setItem('vfm:live-epoch', String(now))
  } catch {
    /* ignore */
  }
  return now
}

/** Three upcoming games from different leagues that are not the demo team's; none on the real site. */
const SIM_MATCHES = (() => {
  if (remote) return []
  const seen = new Set<string>()
  return MATCHES.filter((m) => {
    if (m.sets || matchDate(m) < NOW || m.home === MY_TEAM_ID || m.away === MY_TEAM_ID || seen.has(m.league)) return false
    seen.add(m.league)
    return true
  }).slice(0, 3)
})()

export const isSimulated = (matchId: string) => SIM_MATCHES.some((m) => m.id === matchId)

export function LiveProvider({ children }: { children: ReactNode }) {
  const { user, team, matches, enterResult, toast } = useStore()
  const [shared, setShared] = useState<LiveSnapshot>(() => transport.load())
  const [now, setNow] = useState(() => Date.now())
  const [epoch, setEpoch] = useState(simEpoch)

  useEffect(() => transport.subscribe(setShared), [])
  useEffect(() => transport.onError?.((text) => toast(text, 'info')), [toast])
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (n - epoch >= LOOP) setEpoch(simEpoch())
    }, 1000)
    return () => clearInterval(t)
  }, [epoch])

  const sims = useMemo(() => SIM_MATCHES.map((m, i) => simulateGame(m, epoch + OFFSETS[i])), [epoch])

  const { games, upcoming } = useMemo(() => {
    const started = sims.filter((g) => g.startedAt <= now).map((g) => simAt(g, now))
    const all = [...Object.values(shared), ...started]
    const rank = (g: LiveGame) => (g.status === 'live' ? 0 : 1)
    all.sort((a, b) => rank(a) - rank(b) || b.updatedAt - a.updatedAt)
    return { games: all, upcoming: sims.filter((g) => g.startedAt > now) }
  }, [sims, shared, now])

  // The database allows the same (can_report_live): home team, "Ergebnisse", no result yet, from a day before kickoff.
  const canReport = useCallback(
    (m: Match) =>
      !!user && user.rights.includes('Ergebnisse') && m.home === team?.id && !m.sets && (!remote || +matchDate(m) - Date.now() < DAY),
    [user, team],
  )

  const proposals = useMemo(
    () =>
      games.flatMap((g) => {
        const match = matches.find((m) => m.id === g.matchId)
        if (g.source !== 'team' || g.status !== 'live' || !match || !canReport(match)) return []
        const st = derive(g.rallies)
        return st.decided ? [{ game: g, match, sets: st.sets }] : []
      }),
    [games, matches, canReport],
  )

  // Demo stand-in for the database trigger matches_finish_live: once a result is in, however it
  // was entered, the live game is over.
  useEffect(() => {
    if (remote) return
    for (const g of Object.values(shared)) {
      if (g.status === 'live' && matches.find((m) => m.id === g.matchId)?.sets) transport.publish({ ...g, status: 'final', updatedAt: Date.now() })
    }
  }, [shared, matches])

  // Every write goes through here so the rights check sits in one place.
  const update = (matchId: string, fn: (g: LiveGame | undefined) => LiveGame | null) => {
    const match = matches.find((m) => m.id === matchId)
    if (!match || !canReport(match)) return null
    const next = fn(transport.load()[matchId])
    if (next) transport.publish(next)
    return next
  }

  const value: Live = {
    games,
    upcoming,
    game: (id) => games.find((g) => g.matchId === id),
    now,
    canReport,
    proposals,
    start: (id) =>
      update(id, (g) => {
        if (g?.status === 'live') return null
        const t = Date.now()
        return { matchId: id, rallies: [], status: 'live', startedAt: t, updatedAt: t, reporter: user!.name, source: 'team' }
      }),
    point: (id, side) => update(id, (g) => (g ? addPoint(g, side) : null)),
    undo: (id) => update(id, (g) => (g ? undoPoint(g) : null)),
    finish: (id) => {
      if (remote) {
        // one write: the database marks the live game final when the result lands (matches_finish_live)
        const g = transport.load()[id]
        const match = matches.find((m) => m.id === id)
        if (!g || !match || !canReport(match) || !derive(g.rallies).decided) return null
        const sets = finalSets(g)
        enterResult(id, sets)
        return sets
      }
      const done = update(id, (g) => (g && derive(g.rallies).decided ? { ...g, status: 'final', updatedAt: Date.now() } : null))
      if (!done) return null
      const sets = finalSets(done)
      enterResult(id, sets)
      return sets
    },
    cancel: (id) => {
      const match = matches.find((m) => m.id === id)
      if (match && canReport(match)) transport.remove(id)
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLive() {
  const l = useContext(Ctx)
  if (!l) throw new Error('LiveProvider missing')
  return l
}
