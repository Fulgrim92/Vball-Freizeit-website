import gsap from 'gsap'

const COLORS = ['var(--ball)', 'var(--accent)', 'var(--fg)', 'var(--hot)']

/** Little celebration: dots and tiny balls fly out of an element and fall. */
export function burst(from: Element | null, count = 22) {
  if (!from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const r = from.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i')
    p.className = 'burst-p'
    const size = 4 + Math.random() * 6
    p.style.cssText = `left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${COLORS[i % COLORS.length]};border-radius:${i % 3 ? '50%' : '2px'}`
    document.body.appendChild(p)
    const a = Math.random() * Math.PI * 2
    const d = 40 + Math.random() * 90
    gsap
      .timeline({ onComplete: () => p.remove() })
      .to(p, { x: Math.cos(a) * d, y: Math.sin(a) * d - 30, rotate: Math.random() * 360, duration: 0.45, ease: 'power3.out' })
      .to(p, { y: `+=${60 + Math.random() * 60}`, opacity: 0, duration: 0.7, ease: 'power1.in' })
  }
}
