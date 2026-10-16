import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MATCHES, type Match, type SetScore } from '../data/season'
import { DEMO_ACCOUNT, ME, type Rsvp } from '../data/myteam'

type Theme = 'system' | 'light' | 'dark'

export interface Toast {
  id: number
  text: string
  tone?: 'ok' | 'info'
}

interface Store {
  user: typeof ME | null
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
  const [loggedIn, setLoggedIn] = useState(() => load('auth', false))
  const [overrides, setOverrides] = useState<Record<string, SetScore[]>>(() => load('results', {}))
  const [myRsvp, setRsvp] = useState<Record<string, Rsvp | undefined>>(() => load('rsvp', {}))
  const [theme, setThemeState] = useState<Theme>(() => load('theme', 'system'))
  const [toasts, setToasts] = useState<Toast[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => save('auth', loggedIn), [loggedIn])
  useEffect(() => save('results', overrides), [overrides])
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
    const ok =
      (username.trim().toLowerCase() === DEMO_ACCOUNT.username || username.trim().toLowerCase() === 'lena@example.org') &&
      password === DEMO_ACCOUNT.password
    if (ok) setLoggedIn(true)
    return ok
  }, [])

  const logout = useCallback(() => {
    setLoggedIn(false)
    toast('Du bist abgemeldet.', 'info')
  }, [toast])

  const matches = useMemo(
    () => MATCHES.map((m) => (overrides[m.id] ? { ...m, sets: overrides[m.id] } : m)),
    [overrides],
  )

  const value: Store = {
    user: loggedIn ? ME : null,
    login,
    logout,
    matches,
    enterResult: (id, sets) => setOverrides((o) => ({ ...o, [id]: sets })),
    myRsvp,
    setMyRsvp: (sid, v) => setRsvp((r) => ({ ...r, [sid]: v })),
    theme,
    setTheme: setThemeState,
    toasts,
    toast,
    paletteOpen,
    setPaletteOpen,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}
