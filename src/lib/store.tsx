import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MATCHES, type Match, type SetScore } from '../data/season'
import { DEMO_ACCOUNTS, SQUAD, type Player, type Right, type Rsvp } from '../data/myteam'

type Theme = 'system' | 'light' | 'dark'

export interface Toast {
  id: number
  text: string
  tone?: 'ok' | 'info'
}

interface Store {
  user: Player | null
  can: (right: Right) => boolean
  rights: Record<string, Right[]>
  setRights: (playerId: string, rights: Right[]) => void
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
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
  const [overrides, setOverrides] = useState<Record<string, SetScore[]>>(() => load('results', {}))
  const [myRsvp, setRsvp] = useState<Record<string, Rsvp | undefined>>(() => load('rsvp', {}))
  const [theme, setThemeState] = useState<Theme>(() => load('theme', 'system'))
  const [toasts, setToasts] = useState<Toast[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => save('auth', loggedIn), [loggedIn])
  useEffect(() => save('results', overrides), [overrides])
  useEffect(() => save('rights', rights), [rights])
  useEffect(() => save('rsvp', myRsvp), [myRsvp])
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

  const login = useCallback(async (username: string, password: string) => {
    await new Promise((r) => setTimeout(r, 900))
    const acc = DEMO_ACCOUNTS.find((a) => a.username === username.trim().toLowerCase() && a.password === password)
    if (acc) setLoggedIn(acc.player)
    return !!acc
  }, [])

  const logout = useCallback(() => {
    setLoggedIn(null)
    toast('Du bist abgemeldet.', 'info')
  }, [toast])

  const matches = useMemo(
    () => MATCHES.map((m) => (overrides[m.id] ? { ...m, sets: overrides[m.id] } : m)),
    [overrides],
  )

  const player = loggedIn ? SQUAD.find((p) => p.id === loggedIn) ?? null : null
  const user = player ? { ...player, rights: rights[player.id] ?? [] } : null
  const mine = Object.fromEntries(
    Object.entries(myRsvp)
      .filter(([k]) => user && k.startsWith(user.id + ':'))
      .map(([k, v]) => [k.slice(k.indexOf(':') + 1), v]),
  )

  const value: Store = {
    user,
    can: (r) => !!user?.rights.includes(r),
    rights,
    setRights: (pid, r) => setRightsState((all) => ({ ...all, [pid]: r })),
    login,
    logout,
    matches,
    enterResult: (id, sets) => setOverrides((o) => ({ ...o, [id]: sets })),
    myRsvp: mine,
    setMyRsvp: (sid, v) => user && setRsvp((r) => ({ ...r, [`${user.id}:${sid}`]: v })),
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
