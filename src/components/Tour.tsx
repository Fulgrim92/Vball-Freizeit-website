import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Compass, X } from 'lucide-react'

export interface TourStep {
  target: string
  title: string
  text: string
}

// Home page tour: each step spotlights a section marked with data-tour="…".
export const HOME_TOUR: TourStep[] = [
  { target: 'tabelle', title: 'Die Tabelle', text: 'Alle 15 Ligen auf einen Blick. Wechsle die Liga oben, tipp auf ein Team für Hallenzeiten und Ansprechpersonen.' },
  { target: 'events', title: 'Was geschah in den letzten Tagen', text: 'Neue Ergebnisse, Forum, Spielerbörse und Turniere in einer Liste, das Neueste zuerst.' },
  { target: 'woche', title: 'Spiele diese Woche', text: 'Alle Partien der nächsten sieben Tage mit Uhrzeit und Halle. Filtere nach deiner Liga.' },
  { target: 'pyramide', title: 'Auf- und Abstieg', text: 'Die Ligapyramide zeigt, wer in jeder Liga vorne liegt. Ein Tipp öffnet die ganze Tabelle.' },
  { target: 'training', title: 'Mein Team', text: 'Für Mannschaften: Zu- und Absagen fürs Training, Ergebnisse eintragen, Rechte verwalten. Probier den Demo-Login aus.' },
]

export function useTour() {
  const [step, setStep] = useState<number | null>(null)
  const start = () => {
    try {
      localStorage.setItem('vfm:tour-seen', '1')
    } catch {
      /* ignore */
    }
    setStep(0)
  }
  return { step, start, stop: () => setStep(null), setStep }
}

export function TourOverlay({ steps, step, setStep }: { steps: TourStep[]; step: number | null; setStep: (n: number | null) => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [cardH, setCardH] = useState(230)
  const cardRef = useCallback((el: HTMLDivElement | null) => {
    if (el) setCardH(el.offsetHeight)
  }, [])
  const nav = useNavigate()
  const cur = step === null ? null : steps[step]

  const measure = useCallback(() => {
    if (!cur) return
    const el = document.querySelector(`[data-tour="${cur.target}"]`)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [cur])

  useLayoutEffect(() => {
    if (!cur) return
    const el = document.querySelector(`[data-tour="${cur.target}"]`)
    if (el) {
      const r = el.getBoundingClientRect()
      // keep tall sections below the sticky header, centre short ones
      const top = window.innerWidth < 760 || r.height > window.innerHeight - 340 ? r.top + window.scrollY - 90 : r.top + window.scrollY - (window.innerHeight - r.height) / 2 + 60
      window.scrollTo({ top, behavior: 'smooth' })
    }
    const t = setTimeout(measure, 450)
    return () => clearTimeout(t)
  }, [cur, measure])

  useEffect(() => {
    if (step === null) return
    const on = () => measure()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStep(null)
      if (e.key === 'ArrowRight') setStep(Math.min(step + 1, steps.length - 1))
      if (e.key === 'ArrowLeft') setStep(Math.max(step - 1, 0))
    }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      window.removeEventListener('keydown', key)
    }
  }, [step, steps.length, setStep, measure])

  const pad = 10
  const last = step === steps.length - 1
  // card below the spotlight, else above it, else pinned to the bottom edge over a tall section
  const H = cardH + 8
  const vh = window.innerHeight
  const narrow = window.innerWidth < 760
  const cardTop = !rect
    ? vh / 2 - H / 2
    : rect.bottom + pad + 12 + H < vh
      ? rect.bottom + pad + 12
      : rect.top - pad - 12 - H > 0
        ? rect.top - pad - 12 - H
        : vh - H - 16
  // over a tall section, move the card into free space beside it when there is room
  const pinned = !!rect && cardTop === vh - H - 16
  const vw = window.innerWidth
  const cardLeft = pinned && rect!.left > 460 ? rect!.left / 2 : pinned && vw - rect!.right > 460 ? rect!.right + (vw - rect!.right) / 2 : vw / 2
  // on phones the card always sits at the bottom edge, the spotlight stays above it
  const sideTop = narrow ? vh - H - 8 : pinned && cardLeft !== vw / 2 ? vh / 2 - H / 2 : cardTop

  return (
    <AnimatePresence>
      {cur && (
        <motion.div className="tour" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-label={`Tour: ${cur.title}`}>
          <div className="tour-click" onClick={() => setStep(null)} />
          {rect && (
            <motion.div
              className="tour-spot"
              animate={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
              transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            />
          )}
          <motion.div ref={cardRef} className="tour-card" key={step} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1, top: sideTop, left: cardLeft }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
            <div className="tour-top">
              <span className="eyebrow">
                Schritt {step! + 1} von {steps.length}
              </span>
              <button className="icon-btn sm" onClick={() => setStep(null)} aria-label="Tour beenden">
                <X size={16} />
              </button>
            </div>
            <h3>{cur.title}</h3>
            <p className="muted">{cur.text}</p>
            <div className="tour-dots" aria-hidden>
              {steps.map((_, i) => (
                <i key={i} className={i === step ? 'on' : ''} />
              ))}
            </div>
            <div className="tour-actions">
              <button className="btn btn-ghost btn-sm" disabled={step === 0} onClick={() => setStep(step! - 1)}>
                <ArrowLeft size={16} /> Zurück
              </button>
              {last ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setStep(null)
                    nav('/login')
                  }}
                >
                  Demo-Login ausprobieren <ArrowRight size={16} />
                </button>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={() => setStep(step! + 1)}>
                  Weiter <ArrowRight size={16} />
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** A small invitation that slides in once on a first visit. */
export function TourInvite({ onStart }: { onStart: () => void }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    let seen = false
    try {
      seen = localStorage.getItem('vfm:tour-seen') === '1'
    } catch {
      /* ignore */
    }
    if (seen) return
    const t = setTimeout(() => setShow(true), 2600)
    return () => clearTimeout(t)
  }, [])
  const close = () => {
    setShow(false)
    try {
      localStorage.setItem('vfm:tour-seen', '1')
    } catch {
      /* ignore */
    }
  }
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="tour-invite" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
          <Compass size={20} />
          <span>Neu hier? In einer Minute durch die Seite.</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              close()
              onStart()
            }}
          >
            Tour starten
          </button>
          <button className="icon-btn sm" onClick={close} aria-label="Hinweis schließen">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
