import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import gsap from 'gsap'
import { TEAM_BY_ID, type SetScore, type Team } from '../data/season'

export function TeamBadge({ team, size = 34 }: { team: Team; size?: number }) {
  return (
    <span
      className="badge"
      style={{ width: size, height: size, '--h': team.hue, fontSize: size * 0.32 } as React.CSSProperties}
      aria-hidden
    >
      {team.short}
    </span>
  )
}

export function TeamLink({ id, strong, badge = true }: { id: string; strong?: boolean; badge?: boolean }) {
  const team = TEAM_BY_ID.get(id)!
  return (
    <Link to={`/mannschaften/${team.id}`} className={`team-link${strong ? ' is-strong' : ''}`}>
      {badge && <TeamBadge team={team} size={26} />}
      <span>{team.name}</span>
    </Link>
  )
}

export function FormDots({ form }: { form: ('S' | 'N')[] }) {
  const last = form.slice(-5)
  return (
    <span className="form-dots" aria-label={`Letzte Spiele: ${last.map((f) => (f === 'S' ? 'Sieg' : 'Niederlage')).join(', ') || 'keine'}`}>
      {Array.from({ length: 5 }, (_, i) => {
        const f = last[i - (5 - last.length)]
        return <i key={i} className={f === 'S' ? 'win' : f === 'N' ? 'loss' : ''} title={f === 'S' ? 'Sieg' : f === 'N' ? 'Niederlage' : 'offen'} />
      })}
    </span>
  )
}

export function SetPills({ sets, perspective }: { sets: SetScore[]; perspective?: 'home' | 'away' }) {
  return (
    <span className="set-pills">
      {sets.map(([h, a], i) => {
        const homeWon = h > a
        const good = perspective ? (perspective === 'home' ? homeWon : !homeWon) : undefined
        return (
          <span key={i} className={`set-pill${good === true ? ' good' : good === false ? ' bad' : ''}`}>
            {h}:{a}
          </span>
        )
      })}
    </span>
  )
}

/** Number that counts up the first time it scrolls into view. */
export function CountUp({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    const el = ref.current
    if (!el || !inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const obj = { v: 0 }
    const tw = gsap.to(obj, {
      v: value,
      duration: 1.2,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = obj.v.toFixed(decimals).replace('.', ',') + suffix),
    })
    return () => {
      tw.kill()
    }
  }, [inView, value, decimals, suffix])
  return (
    <span ref={ref} className="num">
      {value.toFixed(decimals).replace('.', ',') + suffix}
    </span>
  )
}

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
}
export const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
} as const

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <motion.header className="page-head" variants={stagger} initial="hidden" animate="show">
      <motion.p className="eyebrow" variants={rise}>
        {eyebrow}
      </motion.p>
      <motion.h1 variants={rise}>{title}</motion.h1>
      {children && <motion.div variants={rise} className="page-head-extra">{children}</motion.div>}
    </motion.header>
  )
}

/** Segmented control with a sliding indicator. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  id: string
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.value === value && <motion.span layoutId={`seg-${id}`} className="seg-ind" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="seg-label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
