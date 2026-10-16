import { hashString, mulberry32, pick, shuffle } from '../lib/random'

export type SetScore = [number, number]

export interface League {
  id: string
  tier: number
  label: string
}

export interface Team {
  id: string
  name: string
  short: string
  league: string
  hue: number
  strength: number
  hall: { day: number; time: string; venue: string }
  contact: string
  founded: number
  members: number
}

export interface Match {
  id: string
  no: number
  league: string
  home: string
  away: string
  /** ISO date + local start time */
  date: string
  time: string
  venue: string
  sets?: SetScore[]
}

export const SEASON = '2026/27'
export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
export const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

const LEAGUE_IDS = ['1', '2A', '2B', '3A', '3B', '3C', '4A', '4B', '4C', '4D', '5A', '5B', '5C', '5D', '5E']

export const LEAGUES: League[] = LEAGUE_IDS.map((id) => ({
  id,
  tier: Number(id[0]),
  label: id === '1' ? 'Liga 1' : `Liga ${id}`,
}))

export const TEAMS_PER_TIER: Record<number, number> = { 1: 8, 2: 8, 3: 8, 4: 7, 5: 6 }

// Liga 1 uses the team names from the real 2026/27 table; every other name is invented.
const LIGA1 = ['Optisch Überlegen', 'Spartak Au', 'Amore Calzone', 'SUPER SMASH', 'ESV München I', 'Kaboom', '6 für Cuba', 'Die Gallier']

const DISTRICTS = [
  'Schwabing', 'Giesing', 'Haidhausen', 'Pasing', 'Sendling', 'Bogenhausen', 'Neuhausen', 'Laim', 'Moosach',
  'Milbertshofen', 'Trudering', 'Perlach', 'Maxvorstadt', 'Westend', 'Hadern', 'Freimann', 'Riem', 'Aubing',
  'Solln', 'Thalkirchen', 'Nymphenburg', 'Lehel', 'Ramersdorf', 'Fürstenried', 'Feldmoching', 'Allach',
  'Harlaching', 'Obermenzing', 'Unterföhring', 'Ismaning', 'Garching', 'Unterhaching', 'Ottobrunn', 'Neubiberg',
  'Gräfelfing', 'Planegg', 'Karlsfeld', 'Haar', 'Aschheim', 'Kirchheim', 'Au',
]
const CLUBS = ['TSV', 'SV', 'DJK', 'FT', 'TuS', 'SC', 'ESV', 'MTV', 'PSV', 'SpVgg']
const ROMAN = ['', ' II', ' III', ' IV']
const FUN = [
  'Netzroller', 'Blockparty', 'Baggerseen', 'Die Pritschen', 'Ballverliebt', 'Aufschlagfehler', 'Hechtsuppe',
  'Satzball', 'Libero Lounge', 'Schmetterlinge', 'Netzwerk', 'Die Annahmeprofis', 'Volley Vegas', 'Spätschicht',
  'Mittwochsmischung', 'Sandkastenhelden', 'Die Netzläufer', 'Feierabendbagger', 'Ballorama', 'Punktlandung',
  'Block & Roll', 'Hallenkobolde', 'Die Zuspieler', 'Mixed Pickles', 'Aufschlagsalat', 'Die Dienstagsrunde',
  'Volleyholics', 'Zweiter Ball', 'Gute Annahme', 'Rotation Ost', 'Die Nachtschicht', 'Isarbagger',
  'Würmtal Wildcats', 'Lochhausen Lions', 'Flying Pretzels', 'Weißwurst Smash', 'Brezn & Block', 'Kein Plan B',
  'Die Netzflüsterer', 'Lauter Lobs', 'Ballstars', 'Satzgewinn', 'Hand am Netz', 'Die Wühlmäuse', 'Tiefe Bälle',
  'Isar Spikers', 'Stammtisch United', 'Blockbuster', 'Pritschmeister', 'Die Sechser', 'Netzhoppers', 'Volleytreffer',
  'Ballerinas & Bagger', 'Oktoberblock', 'Schwarze Linie', 'Punkt für Punkt', 'Die Läufer', 'Plan Volley',
  'Zuspiel Zentrale', 'Baggerbande', 'Die Rückraumler', 'Grüne Welle Mixed', 'Kurze Diagonale',
]
const FIRST = [
  'Lena', 'Jonas', 'Sophie', 'Felix', 'Marie', 'Lukas', 'Anna', 'Maximilian', 'Laura', 'Paul', 'Julia', 'Tobias',
  'Hannah', 'Simon', 'Clara', 'Moritz', 'Lea', 'David', 'Katharina', 'Florian', 'Johanna', 'Sebastian', 'Miriam',
  'Alexander', 'Theresa', 'Benedikt', 'Nina', 'Quirin', 'Vroni', 'Kilian', 'Selin', 'Emre', 'Aylin', 'Mateo',
]
const LAST = [
  'Huber', 'Bauer', 'Wagner', 'Maier', 'Gruber', 'Hofmann', 'Brandl', 'Schmid', 'Fischer', 'Weber', 'Ostermeier',
  'Lechner', 'Kraus', 'Seidl', 'Pichler', 'Zimmermann', 'Winkler', 'Steiner', 'Yilmaz', 'Novak', 'Rossi', 'Berger',
]
const HALL = ['Turnhalle', 'Sporthalle', 'Dreifachhalle', 'Schulturnhalle']
const TIMES = ['19:00', '19:30', '20:00', '20:00', '20:30']

export function randomPerson(rng: () => number) {
  return `${pick(rng, FIRST)} ${pick(rng, LAST)}`
}

function shortName(name: string) {
  const words = name.replace(/[^\p{L}\d ]/gu, '').split(/\s+/).filter(Boolean)
  const s = words.length >= 3 ? words.slice(0, 3).map((w) => w[0]).join('') : words.length === 2 ? words[0][0] + words[1].slice(0, 2) : words[0].slice(0, 3)
  return s.toUpperCase()
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function buildTeams(): Team[] {
  const rng = mulberry32(2026)
  const fun = shuffle(rng, FUN)
  const districts = shuffle(rng, DISTRICTS)
  const used = new Set<string>()
  const teams: Team[] = []
  let fi = 0
  let di = 0
  for (const league of LEAGUES) {
    const n = TEAMS_PER_TIER[league.tier]
    for (let i = 0; i < n; i++) {
      let name: string
      if (league.id === '1') name = LIGA1[i]
      else if (rng() < 0.32) {
        do name = `${pick(rng, CLUBS)} ${districts[di++ % districts.length]}${pick(rng, ROMAN)}`
        while (used.has(name))
      } else name = fun[fi++ % fun.length]
      used.add(name)
      const district = / Au( |$)/.test(name) ? 'Au' : districts[(di + i * 7) % districts.length]
      teams.push({
        id: slug(name),
        name,
        short: shortName(name),
        league: league.id,
        hue: Math.floor(rng() * 360),
        // lower tiers are weaker on average, with plenty of overlap
        strength: 0.62 - league.tier * 0.035 + rng() * 0.14,
        hall: { day: Math.floor(rng() * 5), time: pick(rng, TIMES), venue: `${pick(rng, HALL)} ${district}` },
        contact: randomPerson(rng),
        founded: 1998 + Math.floor(rng() * 27),
        members: 9 + Math.floor(rng() * 9),
      })
    }
  }
  return teams
}

export const TEAMS = buildTeams()
export const TEAM_BY_ID = new Map(TEAMS.map((t) => [t.id, t]))
export const teamsOf = (league: string) => TEAMS.filter((t) => t.league === league)

/** Simulate one set rally by rally: first to `target`, win by two. */
function playSet(rng: () => number, pHome: number, target: number): SetScore {
  let h = 0
  let a = 0
  while (!((h >= target || a >= target) && Math.abs(h - a) >= 2)) {
    if (rng() < pHome) h++
    else a++
  }
  return [h, a]
}

function simulate(rng: () => number, home: Team, away: Team): SetScore[] {
  const p = 0.5 + (home.strength - away.strength) * 0.9 + 0.015
  const sets: SetScore[] = []
  let hw = 0
  let aw = 0
  while (hw < 2 && aw < 2) {
    const s = playSet(rng, Math.min(0.68, Math.max(0.32, p)), sets.length === 2 ? 15 : 25)
    sets.push(s)
    if (s[0] > s[1]) hw++
    else aw++
  }
  return sets
}

const SEASON_START = new Date(2026, 9, 5) // Mo 05.10.2026
const BREAK_FROM = new Date(2026, 11, 21)
const BREAK_TO = new Date(2027, 0, 6)

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function matchDate(m: Pick<Match, 'date' | 'time'>) {
  const [y, mo, d] = m.date.split('-').map(Number)
  const [h, mi] = m.time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi)
}

function buildMatches(now: Date): Match[] {
  const matches: Match[] = []
  for (const league of LEAGUES) {
    const rng = mulberry32(hashString('spielplan-' + league.id))
    const ids = teamsOf(league.id).map((t) => t.id)
    const list: (string | null)[] = ids.length % 2 ? [...ids, null] : [...ids]
    const n = list.length
    const rounds: [string, string][][] = []
    // circle method
    const rot = list.slice()
    for (let r = 0; r < n - 1; r++) {
      const pairs: [string, string][] = []
      for (let i = 0; i < n / 2; i++) {
        const a = rot[i]
        const b = rot[n - 1 - i]
        if (a && b) pairs.push(r % 2 ? [b, a] : [a, b])
      }
      rounds.push(pairs)
      rot.splice(1, 0, rot.pop()!)
    }
    const all = [...rounds, ...rounds.map((p) => p.map(([a, b]) => [b, a] as [string, string]))]
    let no = 1
    all.forEach((pairs, r) => {
      // every round spans two weeks; skip the christmas break
      const windowStart = new Date(SEASON_START)
      windowStart.setDate(windowStart.getDate() + r * 14)
      if (windowStart >= BREAK_FROM) windowStart.setDate(windowStart.getDate() + 21)
      for (const [h, a] of pairs) {
        const home = TEAM_BY_ID.get(h)!
        const d = new Date(windowStart)
        d.setDate(d.getDate() + home.hall.day + (rng() < 0.5 ? 0 : 7))
        if (d >= BREAK_FROM && d < BREAK_TO) d.setDate(d.getDate() + 21)
        const m: Match = {
          id: `${league.id}-${no}`,
          no: no++,
          league: league.id,
          home: h,
          away: a,
          date: isoDate(d),
          time: home.hall.time,
          venue: home.hall.venue,
        }
        if (matchDate(m) < now) m.sets = simulate(rng, home, TEAM_BY_ID.get(a)!)
        matches.push(m)
      }
    })
  }
  return matches.sort((a, b) => +matchDate(a) - +matchDate(b))
}

export const NOW = new Date()
export const MATCHES = buildMatches(NOW)

// Leave the demo team's latest home game without a result so "Ergebnis eintragen" has something to do.
export const PENDING_RESULT_ID = (() => {
  const m = MATCHES.filter((x) => x.home === 'spartak-au' && x.sets).pop()
  if (m) delete m.sets
  return m?.id
})()

export interface Standing {
  team: Team
  played: number
  wins: number
  losses: number
  points: number
  setsFor: number
  setsAgainst: number
  ballsFor: number
  ballsAgainst: number
  form: ('S' | 'N')[]
}

/** Winner gets 2 points; a loser who took a set gets 1 (best of three). */
export function computeStandings(league: string, matches: Match[]): Standing[] {
  const rows = new Map<string, Standing>(
    teamsOf(league).map((team) => [
      team.id,
      { team, played: 0, wins: 0, losses: 0, points: 0, setsFor: 0, setsAgainst: 0, ballsFor: 0, ballsAgainst: 0, form: [] },
    ]),
  )
  for (const m of matches) {
    if (m.league !== league || !m.sets) continue
    const h = rows.get(m.home)!
    const a = rows.get(m.away)!
    let hs = 0
    let as = 0
    for (const [x, y] of m.sets) {
      if (x > y) hs++
      else as++
      h.ballsFor += x; h.ballsAgainst += y
      a.ballsFor += y; a.ballsAgainst += x
    }
    h.setsFor += hs; h.setsAgainst += as
    a.setsFor += as; a.setsAgainst += hs
    h.played++; a.played++
    const [win, lose, lostSets] = hs > as ? [h, a, as] : [a, h, hs]
    win.wins++; win.points += 2; win.form.push('S')
    lose.losses++; lose.form.push('N')
    if (lostSets > 0) lose.points += 1
  }
  const q = (f: number, a: number) => (a === 0 ? (f === 0 ? 0 : 99) : f / a)
  return [...rows.values()].sort(
    (x, y) =>
      y.points - x.points ||
      q(y.setsFor, y.setsAgainst) - q(x.setsFor, x.setsAgainst) ||
      q(y.ballsFor, y.ballsAgainst) - q(x.ballsFor, x.ballsAgainst) ||
      x.team.name.localeCompare(y.team.name),
  )
}

export function setsWon(sets: SetScore[]) {
  return sets.reduce<[number, number]>((acc, [h, a]) => (h > a ? [acc[0] + 1, acc[1]] : [acc[0], acc[1] + 1]), [0, 0])
}

const dateFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' })
export const fmtDate = (d: Date) => dateFmt.format(d)
export const fmtShort = (d: Date) => shortFmt.format(d).replace('.', '')
export const weekdayOf = (d: Date) => WEEKDAYS[(d.getDay() + 6) % 7]

export function relativeDay(d: Date, now = new Date()) {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((+b - +a) / 86400000)
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Morgen'
  if (diff === -1) return 'Gestern'
  if (diff > 1 && diff < 7) return `in ${diff} Tagen`
  if (diff < -1 && diff > -7) return `vor ${-diff} Tagen`
  return fmtDate(d)
}
