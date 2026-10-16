import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, LogIn, Sparkles, UserPlus } from 'lucide-react'
import { useStore } from '../lib/store'
import { DEMO_ACCOUNTS, SQUAD } from '../data/myteam'
import { burst } from '../lib/burst'

export default function Login() {
  const { login, user, toast, backend, signUp, resetPassword, recovery, updatePassword } = useStore()
  const demo = backend === 'demo'
  const nav = useNavigate()
  const loc = useLocation()
  const [mode, setMode] = useState<'login' | 'reset' | 'register'>('login')
  const [name, setName] = useState('')
  const [fullName, setFullName] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const shake = useAnimationControls()
  const submitRef = useRef<HTMLButtonElement>(null)
  const from = (loc.state as { from?: string } | null)?.from ?? '/mein-team'

  useEffect(() => {
    if (user && !recovery) nav(from, { replace: true })
  }, [user, recovery, nav, from])

  const fail = (text: string) => {
    setError(text)
    shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } })
  }

  const typeDemo = async (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setError('')
    const type = async (text: string, set: (s: string) => void) => {
      for (let i = 1; i <= text.length; i++) {
        set(text.slice(0, i))
        await new Promise((r) => setTimeout(r, 45))
      }
    }
    setName('')
    setPw('')
    await type(acc.username, setName)
    await type(acc.password, setPw)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!name.trim() || !pw) return fail(demo ? 'Bitte Benutzername oder E-Mail und Passwort eingeben.' : 'Bitte E-Mail und Passwort eingeben.')
    setBusy(true)
    setError('')
    const ok = await login(name, pw)
    setBusy(false)
    if (ok) {
      burst(submitRef.current, 28)
      const acc = DEMO_ACCOUNTS.find((a) => a.username === name.trim().toLowerCase())
      const first = SQUAD.find((p) => p.id === acc?.player)?.name.split(' ')[0]
      toast(`Willkommen zurück${first ? `, ${first}` : ''}!`)
    } else {
      fail(demo ? 'Benutzername oder Passwort stimmt nicht. Für die Demo: „demo“ oder „spieler“, Passwort „volley“.' : 'E-Mail oder Passwort stimmt nicht.')
    }
  }

  const register = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!fullName.trim() || !name.trim() || pw.length < 6) return fail('Bitte Name, E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben.')
    setBusy(true)
    setError('')
    const res = await signUp(name, pw, fullName)
    setBusy(false)
    if (res.error) return fail(res.error)
    if (res.confirm) {
      toast('Fast geschafft: Bestätige deine E-Mail über den Link, den wir dir geschickt haben.', 'info')
      setMode('login')
    } else toast(`Willkommen, ${fullName.trim().split(' ')[0]}!`)
  }

  // back from a reset link: signed in for this one purpose
  if (recovery) {
    return (
      <div className="wrap page login-page">
        <motion.div className="login-card" animate={shake}>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (pw.length < 6) return fail('Das Passwort braucht mindestens 6 Zeichen.')
              setBusy(true)
              const err = await updatePassword(pw)
              setBusy(false)
              if (err) return fail(err)
              toast('Neues Passwort gespeichert.')
            }}
            noValidate
          >
            <p className="eyebrow">Konto</p>
            <h1>Neues Passwort</h1>
            <div className="field">
              <input id="new-pw" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder=" " />
              <label htmlFor="new-pw">Neues Passwort</label>
              <button type="button" className="field-icon" onClick={() => setShow((s) => !s)} aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? <Loader2 size={18} className="spin" /> : <KeyRound size={18} />} Passwort speichern
            </button>
          </form>
        </motion.div>
      </div>
    )
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

              {demo && (
                <div className="demo-chips">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button key={acc.username} type="button" className="demo-chip" onClick={() => typeDemo(acc)}>
                      <Sparkles size={15} /> Demo: {acc.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="field">
                <input id="login-name" type={demo ? 'text' : 'email'} autoComplete={demo ? 'username' : 'email'} value={name} onChange={(e) => setName(e.target.value)} placeholder=" " />
                <label htmlFor="login-name">{demo ? 'Benutzername oder E-Mail' : 'E-Mail'}</label>
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
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    if (demo) return toast('Registrierung ist im Entwurf noch nicht angebunden.', 'info')
                    setError('')
                    setMode('register')
                  }}
                >
                  Registrieren
                </button>
              </div>
            </motion.form>
          ) : mode === 'register' ? (
            <motion.form key="register" onSubmit={register} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} noValidate>
              <p className="eyebrow">Konto</p>
              <h1>Registrieren</h1>
              <p className="muted">Nach der Registrierung trittst du mit dem Einladungscode deines Teams bei.</p>
              <div className="field">
                <input id="reg-name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder=" " />
                <label htmlFor="reg-name">Vor- und Nachname</label>
              </div>
              <div className="field">
                <input id="reg-mail" type="email" autoComplete="email" value={name} onChange={(e) => setName(e.target.value)} placeholder=" " />
                <label htmlFor="reg-mail">E-Mail</label>
              </div>
              <div className="field">
                <input id="reg-pw" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder=" " />
                <label htmlFor="reg-pw">Passwort (mindestens 6 Zeichen)</label>
                <button type="button" className="field-icon" onClick={() => setShow((s) => !s)} aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="btn btn-primary btn-block" disabled={busy}>
                {busy ? <Loader2 size={18} className="spin" /> : <UserPlus size={18} />} Konto anlegen
              </button>
              <div className="login-links">
                <button type="button" className="link" onClick={() => setMode('login')}>
                  <ArrowLeft size={14} /> Zurück
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="reset"
              onSubmit={async (e) => {
                e.preventDefault()
                await resetPassword(name)
                toast(`Falls ein Konto existiert, ist ein Link zum Zurücksetzen unterwegs${demo ? ' (Demo)' : ''}.`, 'info')
                setMode('login')
              }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <p className="eyebrow">Konto</p>
              <h1>Passwort zurücksetzen</h1>
              <p className="muted">{demo ? 'Gib deinen Benutzernamen oder deine E-Mail ein.' : 'Gib deine E-Mail ein.'} Wir schicken dir einen Link.</p>
              <div className="field">
                <input id="reset-name" type={demo ? 'text' : 'email'} value={name} onChange={(e) => setName(e.target.value)} placeholder=" " />
                <label htmlFor="reset-name">{demo ? 'Benutzername oder E-Mail' : 'E-Mail'}</label>
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
