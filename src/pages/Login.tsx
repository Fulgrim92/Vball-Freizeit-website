import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, LogIn, Sparkles } from 'lucide-react'
import { useStore } from '../lib/store'
import { DEMO_ACCOUNT } from '../data/myteam'
import { burst } from '../lib/burst'

export default function Login() {
  const { login, user, toast } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const shake = useAnimationControls()
  const submitRef = useRef<HTMLButtonElement>(null)
  const from = (loc.state as { from?: string } | null)?.from ?? '/mein-team'

  useEffect(() => {
    if (user) nav(from, { replace: true })
  }, [user, nav, from])

  const typeDemo = async () => {
    setError('')
    const type = async (text: string, set: (s: string) => void) => {
      for (let i = 1; i <= text.length; i++) {
        set(text.slice(0, i))
        await new Promise((r) => setTimeout(r, 45))
      }
    }
    setName('')
    setPw('')
    await type(DEMO_ACCOUNT.username, setName)
    await type(DEMO_ACCOUNT.password, setPw)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!name.trim() || !pw) {
      setError('Bitte Benutzername oder E-Mail und Passwort eingeben.')
      shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } })
      return
    }
    setBusy(true)
    setError('')
    const ok = await login(name, pw)
    setBusy(false)
    if (ok) {
      burst(submitRef.current, 28)
      toast('Willkommen zurück, Lena!')
    } else {
      setError('Benutzername oder Passwort stimmt nicht. Für die Demo: „demo“ und „volley“.')
      shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } })
    }
  }

  return (
    <div className="wrap page login-page">
      <motion.div className="login-card" animate={shake}>
        <div className="login-court" aria-hidden>
          <span className="lc-net" />
          <motion.span className="lc-ball" animate={{ y: [0, -26, 0], x: [-40, 0, 40, 0, -40] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'login' ? (
            <motion.form key="login" onSubmit={submit} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} noValidate>
              <p className="eyebrow">Mein Team</p>
              <h1>Anmelden</h1>
              <p className="muted">Mit deinem Konto verwaltest du Training, Ergebnisse und Rechte deiner Mannschaft.</p>

              <button type="button" className="demo-chip" onClick={typeDemo}>
                <Sparkles size={15} /> Demo-Zugang einsetzen
              </button>

              <div className="field">
                <input id="login-name" autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} placeholder=" " />
                <label htmlFor="login-name">Benutzername oder E-Mail</label>
              </div>
              <div className="field">
                <input id="login-pw" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder=" " />
                <label htmlFor="login-pw">Passwort</label>
                <button type="button" className="field-icon" onClick={() => setShow((s) => !s)} aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p className="form-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <button ref={submitRef} className="btn btn-primary btn-block" disabled={busy}>
                {busy ? <Loader2 size={18} className="spin" /> : <LogIn size={18} />} {busy ? 'Anmelden …' : 'Anmelden'}
              </button>
              <div className="login-links">
                <button type="button" className="link" onClick={() => setMode('reset')}>
                  Passwort vergessen?
                </button>
                <button type="button" className="link" onClick={() => toast('Registrierung ist im Entwurf noch nicht angebunden.', 'info')}>
                  Registrieren
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="reset"
              onSubmit={(e) => {
                e.preventDefault()
                toast('Falls ein Konto existiert, ist ein Link zum Zurücksetzen unterwegs (Demo).', 'info')
                setMode('login')
              }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <p className="eyebrow">Konto</p>
              <h1>Passwort zurücksetzen</h1>
              <p className="muted">Gib deinen Benutzernamen oder deine E-Mail ein. Wir schicken dir einen Link.</p>
              <div className="field">
                <input id="reset-name" value={name} onChange={(e) => setName(e.target.value)} placeholder=" " />
                <label htmlFor="reset-name">Benutzername oder E-Mail</label>
              </div>
              <button className="btn btn-primary btn-block">
                <KeyRound size={18} /> Link senden
              </button>
              <div className="login-links">
                <button type="button" className="link" onClick={() => setMode('login')}>
                  <ArrowLeft size={14} /> Zurück
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
      <p className="muted small center">
        Nur schauen? <Link to="/tabellen">Tabellen gibt es ohne Login.</Link>
      </p>
    </div>
  )
}
