// Everything that talks to Supabase. Only loaded when BACKEND === 'supabase' (see main.tsx),
// so the demo build carries none of it. Rights are enforced by the database
// (supabase/migrations); the checks in the UI are only there to hide what you can't do.
import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'
import { LEAGUES, MATCHES, matchDate, TEAM_BY_ID, TEAMS, type Match, type SetScore, type Team } from '../data/season'
import type { Slot } from '../data/teams'
import { sessionsAround, type Player, type Right, type Rsvp, type Session } from '../data/myteam'
import type { LiveGame } from '../live/engine'
import type { LiveSnapshot, LiveTransport } from '../live/transport'

export const db = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  // PKCE puts ?code= in the query, which leaves the HashRouter's #/route alone
  auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true },
})

/** Postgres error text is German where it comes from our own triggers; keep it, else a generic line. */
function message(error: { message?: string; code?: string } | null, fallback: string) {
  if (!error) return null
  if (error.code === '42501' && error.message?.startsWith('permission denied')) return 'Dafür fehlt dir das Recht.'
  if (error.message && /[äöüß„]|Staffelleitung|Spiel|Recht|Saison|Einladung/.test(error.message)) return error.message
  if (error.message?.includes('row-level security')) return 'Dafür fehlt dir das Recht.'
  return fallback
}

// ───────────────────────── Season ─────────────────────────

interface TeamRow {
  id: string
  league_id: string
  name: string
  short: string
  club: string | null
  hue: number
  venues: string[]
  slots: Slot[]
  contacts: string[]
}
interface MatchRow {
  id: string
  no: number
  league_id: string
  home_id: string
  away_id: string
  date: string
  time: string
  venue: string
  sets: SetScore[] | null
}

async function selectAll<T>(table: string, order: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select('*').order(order).range(from, from + 999)
    if (error) throw error
    rows.push(...(data as T[]))
    if (data.length < 1000) return rows
  }
}

const toMatch = (r: MatchRow): Match => ({
  id: r.id,
  no: r.no,
  league: r.league_id,
  home: r.home_id,
  away: r.away_id,
  date: r.date,
  time: r.time.slice(0, 5),
  venue: r.venue,
  ...(r.sets ? { sets: r.sets } : {}),
})

/**
 * Replaces the bundled demo season with the database's, in place, before the app renders, so
 * every page that imports LEAGUES, TEAMS or MATCHES sees the real data.
 */
export async function loadSeason() {
  const [leagues, teams, matches] = await Promise.all([
    selectAll<{ id: string; tier: number; label: string; lead: string }>('leagues', 'sort'),
    selectAll<TeamRow>('teams', 'name'),
    selectAll<MatchRow>('matches', 'id'),
  ])
  LEAGUES.splice(0, LEAGUES.length, ...leagues.map(({ id, tier, label, lead }) => ({ id, tier, label, lead })))
  const list: Team[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    league: t.league_id,
    club: t.club ?? undefined,
    venues: t.venues,
    slots: t.slots,
    contacts: t.contacts,
    short: t.short,
    hue: t.hue,
    // only drives the demo's simulated games
    strength: 0.5,
    hall: { day: t.slots[0]?.day ?? 0, time: t.slots[0]?.from ?? '20:00', venue: t.venues[0] ?? 'Halle nicht angegeben' },
  }))
  TEAMS.splice(0, TEAMS.length, ...list)
  TEAM_BY_ID.clear()
  for (const t of list) TEAM_BY_ID.set(t.id, t)
  MATCHES.splice(0, MATCHES.length, ...matches.map(toMatch).sort((a, b) => +matchDate(a) - +matchDate(b)))
}

/** Results entered anywhere show up without a reload. */
export function subscribeResults(cb: (matchId: string, sets: SetScore[] | undefined) => void) {
  const ch = db
    .channel('results')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, (p) => {
      const row = p.new as MatchRow
      cb(row.id, row.sets ?? undefined)
    })
    .subscribe()
  return () => void db.removeChannel(ch)
}

export async function submitResult(matchId: string, sets: SetScore[]) {
  const { data, error } = await db.from('matches').update({ sets }).eq('id', matchId).select('id')
  if (error) return message(error, 'Das Ergebnis konnte nicht gespeichert werden.')
  if (!data.length) return 'Dafür fehlt dir das Recht, oder das Ergebnis ist schon eingetragen.'
  return null
}

export async function requestMove(matchId: string, teamId: string, when: Date, reason: string) {
  const { error } = await db.from('move_requests').insert({ match_id: matchId, team_id: teamId, proposed_at: when.toISOString(), reason })
  return message(error, 'Der Antrag konnte nicht gesendet werden.')
}

// ───────────────────────── Accounts ─────────────────────────

const here = () => window.location.origin + window.location.pathname

export async function signIn(email: string, password: string) {
  const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
  return error ? 'E-Mail oder Passwort stimmt nicht.' : null
}

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await db.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim() }, emailRedirectTo: here() + '#/mein-team' },
  })
  if (error) return { error: error.message.includes('Password') ? 'Das Passwort braucht mindestens 6 Zeichen.' : 'Registrierung fehlgeschlagen. Ist die E-Mail schon vergeben?' }
  // with e-mail confirmation on, there is no session until the link is clicked
  return { error: null, confirm: !data.session }
}

export async function resetPassword(email: string) {
  await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: here() + '#/login' })
}

export async function updatePassword(password: string) {
  const { error } = await db.auth.updateUser({ password })
  return error ? 'Das Passwort konnte nicht geändert werden (mindestens 6 Zeichen).' : null
}

export const signOut = () => db.auth.signOut()

/** Calls back with the signed-in user's id (or null), and whether they came from a reset link. */
export function onAuth(cb: (userId: string | null, recovery: boolean) => void) {
  const { data } = db.auth.onAuthStateChange((event, session) => {
    // supabase-js deadlocks if the callback awaits other calls; run it after the event
    setTimeout(() => cb(session?.user.id ?? null, event === 'PASSWORD_RECOVERY'), 0)
  })
  return () => data.subscription.unsubscribe()
}

// ───────────────────────── My team ─────────────────────────

export interface RemoteTeam {
  id: string
  squad: Player[]
  past: Session[]
  next: Session[]
  /** answers[sessionId][playerId], every member including me */
  answers: Record<string, Record<string, Rsvp | undefined>>
}

interface MemberRow {
  user_id: string
  number: number | null
  position: Player['position'] | null
  office: string | null
  rights: Right[]
  joined_at: string
  profiles: { name: string } | null
}

/** The user's name and first team (squad, training sessions, answers); team is null until they join one. */
export async function loadAccount(userId: string): Promise<{ name: string; team: RemoteTeam | null }> {
  const [profile, mine] = await Promise.all([
    db.from('profiles').select('name').eq('id', userId).maybeSingle(),
    db.from('team_members').select('team_id').eq('user_id', userId).order('joined_at').limit(1),
  ])
  if (profile.error) throw profile.error
  const name = (profile.data?.name as string | undefined) || 'Ohne Namen'
  const teamId = mine.data?.[0]?.team_id as string | undefined
  const team = teamId && TEAM_BY_ID.get(teamId)
  if (!teamId || !team) return { name, team: null }

  const slots = team.slots.map((s) => ({
    day: s.day,
    start: s.from.split(':').map(Number) as [number, number],
    end: s.to ?? '',
    venue: team.venues[0] ?? '',
  }))
  const { past, next } = sessionsAround(new Date(), 16, 4, slots)
  const sessions = [...past, ...next].map((s) => ({ ...s, focus: '' }))

  const [members, answers] = await Promise.all([
    db.from('team_members').select('user_id, number, position, office, rights, joined_at, profiles(name)').eq('team_id', teamId).order('joined_at'),
    db.from('training_rsvps').select('session_date, user_id, answer').eq('team_id', teamId).gte('session_date', sessions[0]?.id ?? '1970-01-01'),
  ])
  if (members.error) throw members.error
  const squad: Player[] = (members.data as unknown as MemberRow[]).map((m) => ({
    id: m.user_id,
    name: m.profiles?.name || 'Ohne Namen',
    number: m.number ?? 0,
    position: m.position ?? ('' as Player['position']),
    rights: m.rights,
    office: m.office ?? undefined,
    reliability: 1,
  }))
  const byDate: RemoteTeam['answers'] = {}
  for (const a of (answers.data ?? []) as { session_date: string; user_id: string; answer: Rsvp }[]) {
    ;(byDate[a.session_date] ??= {})[a.user_id] = a.answer
  }
  return { name, team: { id: teamId, squad, past: sessions.slice(0, past.length), next: sessions.slice(past.length), answers: byDate } }
}

export async function joinTeam(code: string) {
  const { error } = await db.rpc('join_team', { invite: code })
  return message(error, 'Der Einladungscode ist ungültig oder abgelaufen.')
}

export async function createInvite(teamId: string) {
  const { data, error } = await db.from('team_invites').insert({ team_id: teamId }).select('code').single()
  return error ? { error: message(error, 'Der Code konnte nicht erstellt werden.') } : { code: data.code as string }
}

export async function saveRights(teamId: string, userId: string, rights: Right[]) {
  const { data, error } = await db.from('team_members').update({ rights }).eq('team_id', teamId).eq('user_id', userId).select('user_id')
  if (error) return message(error, 'Die Rechte konnten nicht gespeichert werden.')
  return data.length ? null : 'Dafür fehlt dir das Recht.'
}

export async function saveRsvp(teamId: string, sessionDate: string, userId: string, answer: Rsvp) {
  const { error } = await db
    .from('training_rsvps')
    .upsert({ team_id: teamId, session_date: sessionDate, user_id: userId, answer, updated_at: new Date().toISOString() })
  return message(error, 'Deine Antwort konnte nicht gespeichert werden.')
}

// ───────────────────────── Live ticker ─────────────────────────

interface LiveRow {
  match_id: string
  rallies: LiveGame['rallies']
  status: LiveGame['status']
  started_at: string
  updated_at: string
  reporter: string
}

const toGame = (r: LiveRow): LiveGame => ({
  matchId: r.match_id,
  rallies: r.rallies,
  status: r.status,
  startedAt: Date.parse(r.started_at),
  updatedAt: Date.parse(r.updated_at),
  reporter: r.reporter,
  source: 'team',
})

const DAY = 24 * 3600 * 1000

/**
 * The live_games table over Supabase realtime. Writes are optimistic and queued per game so
 * quick taps arrive in order; if the database refuses one (no right, result already in),
 * the game falls back to the server's state and the error is reported.
 */
export function createSupabaseTransport(): LiveTransport {
  let memory: LiveSnapshot = {}
  const listeners = new Set<(g: LiveSnapshot) => void>()
  const errorListeners = new Set<(text: string) => void>()
  const queues = new Map<string, Promise<unknown>>()
  const emit = () => listeners.forEach((cb) => cb({ ...memory }))
  const fail = (text: string) => errorListeners.forEach((cb) => cb(text))

  const put = (game: LiveGame) => {
    const known = memory[game.matchId]
    if (!known || game.updatedAt >= known.updatedAt) memory = { ...memory, [game.matchId]: game }
  }
  const refetch = async (matchId: string) => {
    const { data } = await db.from('live_games').select('*').eq('match_id', matchId).maybeSingle()
    const rest = { ...memory }
    delete rest[matchId]
    memory = data ? { ...rest, [matchId]: toGame(data as LiveRow) } : rest
    emit()
  }
  type Write = { error: { message?: string; code?: string } | null; data: unknown[] | null }
  const enqueue = (matchId: string, write: () => PromiseLike<Write>) => {
    const run = (queues.get(matchId) ?? Promise.resolve()).then(async () => {
      const { error, data } = await write()
      // RLS turns a forbidden update or delete into "no rows", not an error
      if (error || !data?.length) {
        fail(message(error, 'Live-Stand konnte nicht gespeichert werden.') ?? 'Dafür fehlt dir das Recht, oder das Spiel hat schon ein Ergebnis.')
        await refetch(matchId)
      }
    })
    queues.set(matchId, run)
  }

  db.from('live_games')
    .select('*')
    .gte('updated_at', new Date(Date.now() - DAY).toISOString())
    .then(({ data }) => {
      for (const r of (data ?? []) as LiveRow[]) put(toGame(r))
      emit()
    })

  const channel: RealtimeChannel = db
    .channel('live_games')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_games' }, (p) => {
      if (p.eventType === 'DELETE') {
        const rest = { ...memory }
        delete rest[(p.old as Partial<LiveRow>).match_id!]
        memory = rest
      } else put(toGame(p.new as LiveRow))
      emit()
    })
    .subscribe()
  void channel

  return {
    load: () => ({ ...memory }),
    publish(game) {
      const existed = !!memory[game.matchId]
      memory = { ...memory, [game.matchId]: game }
      emit()
      const row = { rallies: game.rallies, status: game.status, updated_at: new Date(game.updatedAt).toISOString(), reporter: game.reporter }
      const update = () => db.from('live_games').update(row).eq('match_id', game.matchId).select('match_id')
      enqueue(game.matchId, async () => {
        if (existed) return update()
        const res = await db
          .from('live_games')
          .insert({ ...row, match_id: game.matchId, started_at: new Date(game.startedAt).toISOString() })
          .select('match_id')
        // someone else's row arrived meanwhile: carry on with an update
        return res.error?.code === '23505' ? update() : res
      })
    },
    remove(matchId) {
      const rest = { ...memory }
      delete rest[matchId]
      memory = rest
      emit()
      enqueue(matchId, () => db.from('live_games').delete().eq('match_id', matchId).select('match_id'))
    },
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    onError(cb) {
      errorListeners.add(cb)
      return () => errorListeners.delete(cb)
    },
  }
}
