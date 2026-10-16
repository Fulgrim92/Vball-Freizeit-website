import { hashString, mulberry32 } from '../lib/random'
import { NOW } from './season'

export type Rsvp = 'ja' | 'vielleicht' | 'nein'

export interface Player {
  id: string
  name: string
  number: number
  position: 'Zuspiel' | 'Außen' | 'Mitte' | 'Diagonal' | 'Libero'
  rights: Right[]
  office?: string
  /** how reliably this person shows up, used to fake history */
  reliability: number
}

export interface Session {
  id: string
  date: Date
  end: string
  venue: string
  focus: string
}

export type Right = 'Ergebnisse' | 'Team bearbeiten' | 'Spielverlegung' | 'Rechte vergeben'
export const ALL_RIGHTS: Right[] = ['Ergebnisse', 'Team bearbeiten', 'Spielverlegung', 'Rechte vergeben']

/** Two demo logins: one with every right, one without, to show how rights gate result entry. */
export const DEMO_ACCOUNTS = [
  { username: 'demo', password: 'volley', player: 'p1', label: 'Kapitänin, alle Rechte' },
  { username: 'spieler', password: 'volley', player: 'p3', label: 'Spielerin, ohne Rechte' },
]

export const MY_TEAM_ID = 'spartak-au'

export const SQUAD: Player[] = [
  { id: 'p1', name: 'Lena Hoffmann', number: 7, position: 'Zuspiel', rights: ['Ergebnisse', 'Team bearbeiten', 'Spielverlegung', 'Rechte vergeben'], office: 'Kapitänin', reliability: 0.92 },
  { id: 'p2', name: 'Jonas Brandl', number: 4, position: 'Außen', rights: ['Ergebnisse'], office: 'Stellvertretung', reliability: 0.85 },
  { id: 'p3', name: 'Aylin Yilmaz', number: 11, position: 'Mitte', rights: [], reliability: 0.78 },
  { id: 'p4', name: 'Moritz Seidl', number: 9, position: 'Diagonal', rights: [], reliability: 0.64 },
  { id: 'p5', name: 'Theresa Lechner', number: 2, position: 'Libero', rights: [], reliability: 0.9 },
  { id: 'p6', name: 'Kilian Huber', number: 14, position: 'Außen', rights: [], reliability: 0.55 },
  { id: 'p7', name: 'Clara Novak', number: 5, position: 'Außen', rights: ['Ergebnisse'], reliability: 0.81 },
  { id: 'p8', name: 'Quirin Ostermeier', number: 12, position: 'Mitte', rights: [], reliability: 0.72 },
  { id: 'p9', name: 'Selin Kraus', number: 3, position: 'Zuspiel', rights: [], reliability: 0.6 },
  { id: 'p10', name: 'Mateo Rossi', number: 8, position: 'Diagonal', rights: [], reliability: 0.83 },
  { id: 'p11', name: 'Vroni Pichler', number: 15, position: 'Mitte', rights: [], reliability: 0.48 },
]

export const ME = SQUAD[0]

// Spartak Au's real hall time; everything about the squad below is example data.
const SLOTS = [{ day: 3, start: [20, 0], end: '22:00', venue: 'Pestalozzi-Gymnasium, Eduard-Schmid-Str. 1' }]
const FOCUS = ['Annahme & Abwehr', 'Aufschlagserie', 'Angriff über Außen', 'Block & Sicherung', 'Spielzüge 5-1', 'Freies Spiel', 'Läufer-System', 'Kondition & Sprungkraft']

function sessionsAround(now: Date, before: number, after: number): { past: Session[]; next: Session[] } {
  const past: Session[] = []
  const next: Session[] = []
  const start = new Date(now)
  start.setDate(start.getDate() - before * 7 - 7)
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < before * 7 + 7 + after * 7 + 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const weekday = (d.getDay() + 6) % 7
    for (const slot of SLOTS) {
      if (slot.day !== weekday) continue
      const date = new Date(d)
      date.setHours(slot.start[0], slot.start[1])
      const key = date.toISOString().slice(0, 10)
      const s = { id: key, date, end: slot.end, venue: slot.venue, focus: FOCUS[hashString(key) % FOCUS.length] }
      if (date < now) past.push(s)
      else next.push(s)
    }
  }
  return { past: past.slice(-before), next: next.slice(0, after) }
}

const { past, next } = sessionsAround(NOW, 16, 4)
export const PAST_SESSIONS = past
export const NEXT_SESSIONS = next

/** attendance[playerId][sessionIndex] for the past sessions */
export const ATTENDANCE: Record<string, boolean[]> = Object.fromEntries(
  SQUAD.map((p) => {
    return [p.id, PAST_SESSIONS.map((s) => mulberry32(hashString(p.id + s.id))() < p.reliability)]
  }),
)

/** Example answers from teammates for the upcoming sessions. My own answers start empty. */
export const INITIAL_RSVP: Record<string, Record<string, Rsvp | undefined>> = Object.fromEntries(
  NEXT_SESSIONS.map((s, si) => [
    s.id,
    Object.fromEntries(
      SQUAD.filter((p) => p.id !== ME.id).map((p) => {
        const r = mulberry32(hashString(p.id + s.id + 'rsvp'))()
        // sessions further out have fewer answers yet
        const answered = r < 0.95 - si * 0.2
        const v: Rsvp | undefined = !answered ? undefined : r < p.reliability * (0.95 - si * 0.2) ? 'ja' : r < 0.85 ? 'vielleicht' : 'nein'
        return [p.id, v]
      }),
    ),
  ]),
)

export const MIN_PLAYERS = 6
