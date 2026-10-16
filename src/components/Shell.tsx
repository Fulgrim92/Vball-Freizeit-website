import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  ChevronRight,
  Home,
  LogIn,
  LogOut,
  Moon,
  MessagesSquare,
  Monitor,
  Search,
  Shirt,
  Sun,
  Table2,
  UserRound,
  Info,
  Menu,
  X,
} from 'lucide-react'
import { useStore } from '../lib/store'
import { LEAGUES, TEAMS } from '../data/season'
import { Segmented, TeamBadge } from './ui'

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Volleyball Freizeitliga München, Startseite">
      <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden>
        <circle cx="20" cy="20" r="17" className="logo-ball" />
        <path d="M20 3c-3 7-3 14 0 17s10 4 17 1M20 20c-4 3-7 9-6 16M20 20C14 17 7 17 4 22" className="logo-seam" />
      </svg>
      <span className="logo-text">
        <b>Freizeitliga</b>
        <small>Volleyball München</small>
      </span>
    </Link>
  )
}

const NAV = [
  { to: '/', label: 'Start', icon: Home, end: true },
  { to: '/tabellen', label: 'Tabellen', icon: Table2 },
  { to: '/mannschaften', label: 'Mannschaften', icon: Shirt },
  { to: '/termine', label: 'Turniere & Termine', short: 'Termine', icon: CalendarDays },
  { to: '/community', label: 'Börse & Forum', short: 'Forum', icon: MessagesSquare },
  { to: '/infos', label: 'Infos', icon: Info },
]

function ThemeSwitch() {
  const { theme, setTheme } = useStore()
  const order = ['system', 'light', 'dark'] as const
  const next = order[(order.indexOf(theme) + 1) % 3]
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  const label = { system: 'System', light: 'Hell', dark: 'Dunkel' }[theme]
  return (
    <button className="icon-btn" onClick={() => setTheme(next)} aria-label={`Farbschema: ${label}. Wechseln`} title={`Farbschema: ${label}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
          <Icon size={18} />
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

function ThemeSegment() {
  const { theme, setTheme } = useStore()
  return (
    <Segmented
      id="sheet-theme"
      value={theme}
      onChange={setTheme}
      options={[
        { value: 'system', label: 'System' },
        { value: 'light', label: 'Hell' },
        { value: 'dark', label: 'Dunkel' },
      ]}
    />
  )
}

export function Header() {
  const { user, setPaletteOpen, logout, setSheetOpen } = useStore()
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => setMenu(false), [loc.pathname])

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap header-row">
        <Logo />
        <nav className="main-nav" aria-label="Hauptnavigation">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                  <span>{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <button className="search-btn" onClick={() => setPaletteOpen(true)} aria-label="Suchen">
            <Search size={16} />
            <span>Suchen</span>
            <kbd>⌘K</kbd>
          </button>
          <ThemeSwitch />
          <button className="icon-btn menu-btn" onClick={() => setSheetOpen(true)} aria-label="Menü öffnen">
            <Menu size={18} />
          </button>
          {user ? (
            <div className="user-menu">
              <button className="avatar-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Konto">
                <span className="avatar">{user.name.split(' ').map((p) => p[0]).join('')}</span>
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    className="menu-pop"
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                  >
                    <p className="menu-name">
                      {user.name}
                      <small>{user.office ?? 'Spielerin'} · Spartak Au</small>
                    </p>
                    <Link to="/mein-team" className="menu-item">
                      <UserRound size={16} /> Mein Team
                    </Link>
                    <button className="menu-item" onClick={logout}>
                      <LogOut size={16} /> Abmelden
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm login-btn">
              <LogIn size={16} /> <span>Anmelden</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export function TabBar() {
  const { user, sheetOpen, setSheetOpen } = useStore()
  const items = [
    NAV[0],
    NAV[1],
    { ...NAV[2], short: 'Teams' },
    user ? { to: '/mein-team', label: 'Mein Team', icon: UserRound } : { to: '/login', label: 'Login', icon: LogIn },
  ]
  return (
    <nav className="tab-bar" aria-label="Schnellnavigation">
      {items.map((n) => (
        <NavLink key={n.to} to={n.to} end={'end' in n ? n.end : undefined} className="tab-item" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="tab-dot" className="tab-glow" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
              <n.icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              <span>{'short' in n && n.short ? n.short : n.label}</span>
            </>
          )}
        </NavLink>
      ))}
      <button className={`tab-item${sheetOpen ? ' active' : ''}`} onClick={() => setSheetOpen(true)} aria-label="Weitere Seiten">
        <Menu size={20} strokeWidth={1.8} />
        <span>Mehr</span>
      </button>
    </nav>
  )
}

export function MenuSheet() {
  const { sheetOpen, setSheetOpen, user, logout, setPaletteOpen } = useStore()
  const loc = useLocation()
  useEffect(() => setSheetOpen(false), [loc.pathname, setSheetOpen])
  useEffect(() => {
    if (!sheetOpen) return
    const on = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [sheetOpen, setSheetOpen])
  return (
    <AnimatePresence>
      {sheetOpen && (
        <motion.div className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheetOpen(false)}>
          <motion.div
            className="sheet"
            role="dialog"
            aria-label="Menü"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => info.offset.y > 90 && setSheetOpen(false)}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sheet-handle" aria-hidden />
            <div className="sheet-head">
              <b>Menü</b>
              <button className="icon-btn sm" onClick={() => setSheetOpen(false)} aria-label="Menü schließen">
                <X size={16} />
              </button>
            </div>
            <button
              className="sheet-search"
              onClick={() => {
                setSheetOpen(false)
                setPaletteOpen(true)
              }}
            >
              <Search size={18} /> Mannschaft, Liga oder Seite suchen
            </button>
            <nav className="sheet-links">
              {NAV.map((n, i) => (
                <motion.div key={n.to} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
                  <NavLink to={n.to} end={n.end} className="sheet-link">
                    <n.icon size={20} />
                    <span>{n.label}</span>
                    <ChevronRight size={18} className="sheet-chev" />
                  </NavLink>
                </motion.div>
              ))}
            </nav>
            <div className="sheet-theme">
              <span>Farbschema</span>
              <ThemeSegment />
            </div>
            <div className="sheet-account">
              {user ? (
                <>
                  <NavLink to="/mein-team" className="btn btn-primary btn-block">
                    <UserRound size={18} /> Mein Team
                  </NavLink>
                  <button className="btn btn-ghost btn-block" onClick={logout}>
                    <LogOut size={18} /> Abmelden ({user.name.split(' ')[0]})
                  </button>
                </>
              ) : (
                <NavLink to="/login" className="btn btn-primary btn-block">
                  <LogIn size={18} /> Anmelden oder Demo-Login
                </NavLink>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type Hit = { key: string; label: string; hint: string; to: string; team?: (typeof TEAMS)[number] }

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, user } = useStore()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const nav = useNavigate()
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(!paletteOpen)
      }
      if (e.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [paletteOpen, setPaletteOpen])

  useEffect(() => {
    if (paletteOpen) {
      setQ('')
      setIdx(0)
      setTimeout(() => input.current?.focus(), 30)
    }
  }, [paletteOpen])

  const hits = useMemo<Hit[]>(() => {
    const pages: Hit[] = [
      ...NAV.map((n) => ({ key: n.to, label: n.label, hint: 'Seite', to: n.to })),
      user
        ? { key: 'mt', label: 'Mein Team: Training & Zusagen', hint: 'Bereich', to: '/mein-team' }
        : { key: 'li', label: 'Anmelden', hint: 'Konto', to: '/login' },
    ]
    const leagues: Hit[] = LEAGUES.map((l) => ({ key: 'l' + l.id, label: `${l.label} Tabelle & Spielplan`, hint: 'Liga', to: `/tabellen/${l.id}` }))
    const teams: Hit[] = TEAMS.map((t) => ({ key: t.id, label: t.name, hint: `Liga ${t.league}`, to: `/mannschaften/${t.id}`, team: t }))
    const needle = q.trim().toLowerCase()
    if (!needle) return [...pages, ...leagues.slice(0, 3), ...teams.filter((t) => t.team!.league === '1').slice(0, 4)]
    return [...pages, ...leagues, ...teams].filter((h) => h.label.toLowerCase().includes(needle) || h.hint.toLowerCase().includes(needle)).slice(0, 12)
  }, [q, user])

  const go = (h: Hit) => {
    setPaletteOpen(false)
    nav(h.to)
  }

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div className="palette-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPaletteOpen(false)}>
          <motion.div
            className="palette"
            role="dialog"
            aria-label="Suche"
            initial={{ y: -16, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -10, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="palette-input">
              <Search size={18} />
              <input
                id="palette-q"
                ref={input}
                value={q}
                placeholder="Mannschaft, Liga oder Seite suchen …"
                onChange={(e) => {
                  setQ(e.target.value)
                  setIdx(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setIdx((i) => Math.min(i + 1, hits.length - 1))
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setIdx((i) => Math.max(i - 1, 0))
                  }
                  if (e.key === 'Enter' && hits[idx]) go(hits[idx])
                }}
              />
              <kbd>Esc</kbd>
            </div>
            <ul className="palette-list" role="listbox">
              {hits.length === 0 && <li className="palette-empty">Nichts gefunden für „{q}“.</li>}
              {hits.map((h, i) => (
                <li key={h.key} role="option" aria-selected={i === idx}>
                  <button className={i === idx ? 'on' : ''} onMouseEnter={() => setIdx(i)} onClick={() => go(h)}>
                    {h.team ? <TeamBadge team={h.team} size={26} /> : <span className="palette-dot" />}
                    <span className="palette-label">{h.label}</span>
                    <span className="palette-hint">{h.hint}</span>
                    <ChevronRight size={16} className="palette-chev" />
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={`toast ${t.tone}`}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-row">
        <div>
          <Logo />
          <p className="muted small">Breitensportliga Kreis München. Organisiert mit dieLiga seit 2000.</p>
        </div>
        <div className="footer-links">
          <Link to="/infos">Fragen & Antworten</Link>
          <Link to="/infos#dokumente">Dokumente</Link>
          <Link to="/infos#kontakt">Kontakt</Link>
          <Link to="/infos#impressum">Impressum / Datenschutz</Link>
        </div>
        <p className="muted small">© 2000 – 2026 · Entwurf eines Redesigns mit Beispieldaten</p>
      </div>
    </footer>
  )
}
