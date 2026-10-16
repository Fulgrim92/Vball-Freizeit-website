import { hashString, mulberry32 } from '../lib/random'
import { TEAM_BY_ID, type Match, type SetScore } from '../data/season'

export type Side = 'home' | 'away'

export interface Rally {
  /** who won the point */
  s: Side
  /** epoch ms */
  t: number
}

/**
 * A live game is just the list of rallies; scores, sets, serve and the feed are derived from it.
 * That keeps undo trivial and makes syncing a whole game (last write wins) safe.
 */
export interface LiveGame {
  matchId: string
  rallies: Rally[]
  status: 'live' | 'final'
  startedAt: number
  updatedAt: number
  /** display name of whoever reports it */
  reporter: string
  source: 'team' | 'sim'
}

export interface LiveEvent {
  kind: 'start' | 'point' | 'set' | 'final'
  t: number
  side?: Side
  text: string
  score?: string
}

export interface LiveState {
  sets: SetScore[]
  current: SetScore
  setsWon: [number, number]
  /** 0-based index of the set being played */
  setIndex: number
  decided: boolean
  serving: Side
  /** set point / match point for … */
  ballFor?: { side: Side; kind: 'Satzball' | 'Matchball' }
}

export const setTarget = (idx: number) => (idx === 2 ? 15 : 25)

const setOver = ([h, a]: SetScore, idx: number) => (h >= setTarget(idx) || a >= setTarget(idx)) && Math.abs(h - a) >= 2

/** Replay the rallies: best of three, sets to 25, decider to 15, win by two. */
export function derive(rallies: Rally[]): LiveState {
  const sets: SetScore[] = []
  let cur: SetScore = [0, 0]
  const won: [number, number] = [0, 0]
  let serving: Side = 'home'
  for (const r of rallies) {
    if (won[0] === 2 || won[1] === 2) break
    cur = r.s === 'home' ? [cur[0] + 1, cur[1]] : [cur[0], cur[1] + 1]
    serving = r.s
    if (setOver(cur, sets.length)) {
      sets.push(cur)
      won[cur[0] > cur[1] ? 0 : 1]++
      cur = [0, 0]
    }
  }
  const decided = won[0] === 2 || won[1] === 2
  const setIndex = Math.min(sets.length, 2)
  let ballFor: LiveState['ballFor']
  if (!decided) {
    for (const side of ['home', 'away'] as const) {
      const i = side === 'home' ? 0 : 1
      const next: SetScore = side === 'home' ? [cur[0] + 1, cur[1]] : [cur[0], cur[1] + 1]
      if (setOver(next, setIndex)) ballFor = { side, kind: won[i] === 1 ? 'Matchball' : 'Satzball' }
    }
  }
  return { sets, current: cur, setsWon: won, setIndex, decided, serving, ballFor }
}

/** The finished sets once the game is decided, as stored for a result. */
export const finalSets = (g: LiveGame) => derive(g.rallies).sets

export function feed(g: LiveGame, match: Match, now = Date.now()): LiveEvent[] {
  const home = TEAM_BY_ID.get(match.home)!.name
  const away = TEAM_BY_ID.get(match.away)!.name
  const name = (s: Side) => (s === 'home' ? home : away)
  const events: LiveEvent[] = []
  if (g.startedAt <= now) events.push({ kind: 'start', t: g.startedAt, text: 'Anpfiff' })
  let cur: SetScore = [0, 0]
  let setNo = 0
  const won: [number, number] = [0, 0]
  for (const r of g.rallies) {
    if (r.t > now || won[0] === 2 || won[1] === 2) break
    cur = r.s === 'home' ? [cur[0] + 1, cur[1]] : [cur[0], cur[1] + 1]
    if (setOver(cur, setNo)) {
      won[cur[0] > cur[1] ? 0 : 1]++
      events.push({ kind: 'set', t: r.t, side: r.s, text: `Satz ${setNo + 1} an ${name(r.s)}`, score: `${cur[0]}:${cur[1]}` })
      if (won[0] === 2 || won[1] === 2) events.push({ kind: 'final', t: r.t, side: r.s, text: `Spiel entschieden, ${won[0]}:${won[1]} Sätze`, score: `${won[0]}:${won[1]}` })
      cur = [0, 0]
      setNo++
    } else events.push({ kind: 'point', t: r.t, side: r.s, text: `Punkt ${name(r.s)}`, score: `${cur[0]}:${cur[1]}` })
  }
  return events.reverse()
}

/** Rallies that have already happened; simulated games carry their future too. */
export const playedSoFar = (g: LiveGame, now = Date.now()) => (g.source === 'sim' ? g.rallies.filter((r) => r.t <= now) : g.rallies)

export function addPoint(g: LiveGame, s: Side, now = Date.now()): LiveGame {
  if (g.status !== 'live' || derive(g.rallies).decided) return g
  return { ...g, rallies: [...g.rallies, { s, t: now }], updatedAt: now }
}

export function undoPoint(g: LiveGame, now = Date.now()): LiveGame {
  if (g.status !== 'live' || !g.rallies.length) return g
  return { ...g, rallies: g.rallies.slice(0, -1), updatedAt: now }
}

/**
 * Demo games: the whole game is precomputed from a seed and a start time, so every tab and
 * device shows the same score without anyone having to broadcast it.
 */
export function simulateGame(match: Match, start: number): LiveGame {
  const rng = mulberry32(hashString('live-' + match.id))
  const h = TEAM_BY_ID.get(match.home)!
  const a = TEAM_BY_ID.get(match.away)!
  const p = Math.min(0.62, Math.max(0.38, 0.5 + (h.strength - a.strength) * 0.9 + 0.015))
  const rallies: Rally[] = []
  let t = start
  for (;;) {
    const before = derive(rallies)
    if (before.decided) break
    t += 4000 + rng() * 7000
    rallies.push({ s: rng() < p ? 'home' : 'away', t })
    // short break between sets
    if (derive(rallies).sets.length > before.sets.length) t += 45000
  }
  const end = rallies[rallies.length - 1].t
  return { matchId: match.id, rallies, status: 'final', startedAt: start, updatedAt: end, reporter: 'Demo-Simulation', source: 'sim' }
}

/** A simulated game as it stands at `now`: still live until its last rally has happened. */
export function simAt(g: LiveGame, now = Date.now()): LiveGame {
  const done = g.rallies[g.rallies.length - 1].t <= now
  const played = playedSoFar(g, now)
  return { ...g, rallies: played, status: done ? 'final' : 'live', updatedAt: played.length ? played[played.length - 1].t : g.startedAt }
}
