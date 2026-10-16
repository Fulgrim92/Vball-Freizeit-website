import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MATCHES, type Match, type SetScore } from '../data/season'
import {
  ATTENDANCE,
  DEMO_ACCOUNTS,
  INITIAL_RSVP,
  MY_TEAM_ID,
  NEXT_SESSIONS,
  PAST_SESSIONS,
  SQUAD,
  type Player,
  type Right,
  type Rsvp,
  type Session,
} from '../data/myteam'
import { BACKEND, remote } from '../backend'
import type { RemoteTeam } from '../backend/remote'

type Theme = 'system' | 'light' | 'dark'

export interface Toast {
  id: number
  text: string
  tone?: 'ok' | 'info'
}

/** The logged-in person's team: squad, training sessions and the others' answers. */
export interface MyTeamData {
  id: string
  squad: Player[]
  past: Session[]
  next: Session[]
  /** attendance[playerId][i] for the past sessions */
  attendance: Record<string, boolean[]>
  /** answers[sessionId][playerId]; your own live in myRsvp */
  answers: Record<string, Record<string, Rsvp | undefined>>
}

const DEMO_TEAM: MyTeamData = { id: MY_TEAM_ID, squad: SQUAD, past: PAST_SESSIONS, next: NEXT_SESSIONS, attendance: ATTENDANCE, answers: INITIAL_RSVP }

interface Store {
  /** 'demo' runs on mock data and demo logins; 'supabase' on real accounts and data */
  backend: typeof BACKEND
  /** false until a stored session has been checked, so pages don't bounce to the login */
  authReady: boolean
  user: Player | null
  /** null while logged out, and for accounts that haven't joined a team yet */
  team: MyTeamData | null
  can: (right: Right) => boolean
  rights: Record<string, Right[]>
  setRights: (playerId: string, rights: Right[]) => void
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  /** error text, or null; confirm: the account waits for the e-mail link */
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; confirm?: boolean }>
  resetPassword: (email: string) => Promise<void>
  /** came back from a password reset link and should choose a new password */
  recovery: boolean
  updatePassword: (password: string) => Promise<string | null>
  joinTeam: (code: string) => Promise<string | null>
  createInvite: () => Promise<{ code?: string; error?: string | null }>
  requestMove: (matchId: string, when: Date, reason: string) => Promise<string | null>
  matches: Match[]
  enterResult: (matchId: string, sets: SetScore[]) => void
  myRsvp: Record<string, Rsvp | undefined>
  setMyRsvp: (sessionId: string, value: Rsvp) => void
  theme: Theme
  setTheme: (t: Theme) => void
  toasts: Toast[]
  toast: (text: string, tone?: Toast['tone']) => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  sheetOpen: boolean
  setSheetOpen: (open: boolean) => void
}

const Ctx = createContext<Store | null>(null)

// Storage can be unavailable (private mode, sandboxed previews); the app works without it.
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem('vfm:' + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem('vfm:' + key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

let toastId = 0

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState<string | null>(() => {
    const v = load<string | boolean | null>('auth', null)
    return v === true ? 'p1' : typeof v === 'string' ? v : null
  })
  const [rights, setRightsState] = useState<Record<string, Right[]>>(() => load('rights', Object.fromEntries(SQUAD.map((p) => [p.id, p.rights]))))
  const [overrides, setOverrides] = useState<Record<string, SetScore[]>>(() => (remote ? {} : load('results', {})))
  const [myRsvp, setRsvp] = useState<Record<string, Rsvp | undefined>>(() => load('rsvp', {}))
  const [theme, setThemeState] = useState<Theme>(() => load('theme', 'system'))
  const [toasts, setToasts] = useState<Toast[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Supabase: the account and its team, loaded whenever the session changes
  const [account, setAccount] = useState<{ id: string; name: string } | null>(null)
  const [remoteTeam, setRemoteTeam] = useState<RemoteTeam | null>(null)
  const [authReady, setAuthReady] = useState(!remote)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (remote) return
    save('auth', loggedIn)
    save('results', overrides)
    save('rights', rights)
    save('rsvp', myRsvp)
  }, [loggedIn, overrides, rights, myRsvp])
  useEffect(() => {
    save('theme', theme)
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = ++toastId
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  const reloadAccount = useCallback(
    async (uid: string | null) => {
      if (!remote) return
      try {
        const a = uid ? await remote.loadAccount(uid) : null
        setAccount(uid && a ? { id: uid, name: a.name } : null)
        setRemoteTeam(a?.team ?? null)
      } catch (e) {
        console.error(e)
        toast('Dein Team konnte nicht geladen werden. Bitte lade die Seite neu.', 'info')
      } finally {
        setAuthReady(true)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (!remote) return
    let last: string | null | undefined
    const offAuth = remote.onAuth((uid, rec) => {
      if (rec) setRecovery(true)
      // token refreshes repeat the same user; only reload on a real change
      if (uid !== last) reloadAccount((last = uid))
    })
    const offResults = remote.subscribeResults((id, sets) => sets && setOverrides((o) => ({ ...o, [id]: sets })))
    return () => {
      offAuth()
      offResults()
    }
  }, [reloadAccount])

  const login = useCallback(async (username: string, password: string) => {
    if (remote) return !(await remote.signIn(username, password))
    await new Promise((r) => setTimeout(r, 900))
    const acc = DEMO_ACCOUNTS.find((a) => a.username === username.trim().toLowerCase() && a.password === password)
    if (acc) setLoggedIn(acc.player)
    return !!acc
  }, [])

  const logout = useCallback(() => {
    if (remote) void remote.signOut()
    else setLoggedIn(null)
    toast('Du bist abgemeldet.', 'info')
  }, [toast])

  const matches = useMemo(
    () => MATCHES.map((m) => (overrides[m.id] ? { ...m, sets: overrides[m.id] } : m)),
    [overrides],
  )

  const team = useMemo<MyTeamData | null>(() => {
    if (!remote) return loggedIn ? DEMO_TEAM : null
    if (!remoteTeam) return null
    const { squad, past, answers } = remoteTeam
    // a past "ja" counts as being there
    const attendance = Object.fromEntries(squad.map((p) => [p.id, past.map((s) => answers[s.id]?.[p.id] === 'ja')]))
    return { ...remoteTeam, attendance }
  }, [loggedIn, remoteTeam])

  let user: Player | null
  let allRights = rights
  let mine: Record<string, Rsvp | undefined>
  if (remote) {
    const member = account && remoteTeam?.squad.find((p) => p.id === account.id)
    user = member ?? (account && { id: account.id, name: account.name, number: 0, position: '' as Player['position'], rights: [], reliability: 1 })
    allRights = Object.fromEntries(remoteTeam?.squad.map((p) => [p.id, p.rights]) ?? [])
    mine = Object.fromEntries(Object.entries(remoteTeam?.answers ?? {}).map(([sid, a]) => [sid, user ? a[user.id] : undefined]))
  } else {
    const player = loggedIn ? SQUAD.find((p) => p.id === loggedIn) ?? null : null
    user = player ? { ...player, rights: rights[player.id] ?? [] } : null
    mine = Object.fromEntries(
      Object.entries(myRsvp)
        .filter(([k]) => user && k.startsWith(user.id + ':'))
        .map(([k, v]) => [k.slice(k.indexOf(':') + 1), v]),
    )
  }

  // Supabase writes are optimistic; when the database says no, the change is undone and explained.
  const patchSquad = (pid: string, r: Right[]) =>
    setRemoteTeam((t) => t && { ...t, squad: t.squad.map((p) => (p.id === pid ? { ...p, rights: r } : p)) })
  const patchAnswer = (sid: string, uid: string, v: Rsvp | undefined) =>
    setRemoteTeam((t) => t && { ...t, answers: { ...t.answers, [sid]: { ...t.answers[sid], [uid]: v } } })

  const value: Store = {
    backend: BACKEND,
    authReady,
    user,
    team,
    can: (r) => !!user?.rights.includes(r),
    rights: allRights,
    setRights: (pid, r) => {
      if (!remote) return setRightsState((all) => ({ ...all, [pid]: r }))
      if (!remoteTeam) return
      const before = allRights[pid] ?? []
      patchSquad(pid, r)
      remote.saveRights(remoteTeam.id, pid, r).then((err) => {
        if (!err) return
        patchSquad(pid, before)
        toast(err, 'info')
      })
    },
    login,
    logout,
    signUp: async (email, password, name) => (remote ? remote.signUp(email, password, name) : { error: 'Registrierung ist in der Demo nicht angebunden.' }),
    resetPassword: async (email) => {
      if (remote) await remote.resetPassword(email)
    },
    recovery,
    updatePassword: async (password) => {
      const err = remote ? await remote.updatePassword(password) : null
      if (!err) setRecovery(false)
      return err
    },
    joinTeam: async (code) => {
      if (!remote || !account) return 'Bitte zuerst anmelden.'
      const err = await remote.joinTeam(code)
      if (!err) await reloadAccount(account.id)
      return err
    },
    createInvite: async () => (remote && remoteTeam ? remote.createInvite(remoteTeam.id) : { error: 'Einladungen gibt es nur mit echten Konten.' }),
    requestMove: async (matchId, when, reason) => (remote && remoteTeam ? remote.requestMove(matchId, remoteTeam.id, when, reason) : null),
    matches,
    enterResult: (id, sets) => {
      setOverrides((o) => ({ ...o, [id]: sets }))
      remote?.submitResult(id, sets).then((err) => {
        if (!err) return
        setOverrides(({ [id]: _, ...rest }) => rest)
        toast(err, 'info')
      })
    },
    myRsvp: mine,
    setMyRsvp: (sid, v) => {
      if (!user) return
      if (!remote) return setRsvp((r) => ({ ...r, [`${user.id}:${sid}`]: v }))
      if (!remoteTeam) return
      const before = mine[sid]
      patchAnswer(sid, user.id, v)
      remote.saveRsvp(remoteTeam.id, sid, user.id, v).then((err) => {
        if (!err) return
        patchAnswer(sid, user.id, before)
        toast(err, 'info')
      })
    },
    theme,
    setTheme: setThemeState,
    toasts,
    toast,
    paletteOpen,
    setPaletteOpen,
    sheetOpen,
    setSheetOpen,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}
