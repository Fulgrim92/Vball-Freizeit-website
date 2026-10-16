import { useEffect, useRef } from 'react'

/**
 * The page's backdrop: a sports hall at night. Two ceiling lamps breathe slowly,
 * dust drifts through their light, a court is drawn in perspective at the bottom,
 * and now and then a faint serve arcs across. Kept dim so content always wins.
 */
export default function AmbientBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0
    let h = 0
    let dpr = 1
    const colors = { line: '#fff', dust: '#fff', lamp: '#fff', ball: '#fc0', alpha: 1 }
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement)
      colors.line = cs.getPropertyValue('--bg-court-line').trim() || '#8899cc'
      colors.dust = cs.getPropertyValue('--bg-dust').trim() || '#ffffff'
      colors.lamp = cs.getPropertyValue('--bg-lamp').trim() || '#fff4d6'
      colors.ball = cs.getPropertyValue('--ball').trim() || '#ffcc33'
      colors.alpha = parseFloat(cs.getPropertyValue('--bg-strength')) || 1
    }
    readColors()

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const motes = Array.from({ length: Math.round(Math.min(70, (w * h) / 22000)) }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: 0.3 + Math.random() * 0.7,
      r: 0.6 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.004,
      vy: -0.004 - Math.random() * 0.01,
      tw: Math.random() * Math.PI * 2,
    }))

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    const onMove = (e: PointerEvent) => {
      pointer.tx = e.clientX / w - 0.5
      pointer.ty = e.clientY / h - 0.5
    }

    let scrollY = window.scrollY
    const onScroll = () => (scrollY = window.scrollY)

    // A serve: a parabola drawn as fading dots, every ~14 s
    let serve: { t: number; x0: number; x1: number; y0: number; peak: number } | null = null
    let nextServe = 3

    const court = (t: number) => {
      // perspective court below the fold line, lines converge to a vanishing point
      const horizon = h * 0.62 - scrollY * 0.08
      const vx = w * 0.5 + pointer.x * 40
      const depth = h - horizon
      const proj = (x: number, z: number) => {
        // x in [-1,1] across court width, z in [0,1] from near to far
        const s = 1 / (1 + z * 3.2)
        return [vx + x * w * 0.62 * s, horizon + depth * s] as const
      }
      ctx.save()
      ctx.globalAlpha = 0.16 * colors.alpha
      ctx.strokeStyle = colors.line
      ctx.lineWidth = 1.2
      const line = (x0: number, z0: number, x1: number, z1: number) => {
        const a = proj(x0, z0)
        const b = proj(x1, z1)
        ctx.beginPath()
        ctx.moveTo(a[0], a[1])
        ctx.lineTo(b[0], b[1])
        ctx.stroke()
      }
      // side lines, end line, centre line, attack lines
      line(-1, 0, -1, 1)
      line(1, 0, 1, 1)
      line(-1, 1, 1, 1)
      line(-1, 0.5, 1, 0.5)
      ctx.setLineDash([6, 8])
      line(-1, 0.5 - 0.1667, 1, 0.5 - 0.1667)
      line(-1, 0.5 + 0.1667, 1, 0.5 + 0.1667)
      ctx.setLineDash([])
      // the net: posts and tape, gently swaying
      const sway = Math.sin(t * 0.6) * 1.5
      const pl = proj(-1.08, 0.5)
      const pr = proj(1.08, 0.5)
      const netH = depth * 0.42
      ctx.globalAlpha = 0.12 * colors.alpha
      ctx.beginPath()
      ctx.moveTo(pl[0], pl[1])
      ctx.lineTo(pl[0], pl[1] - netH)
      ctx.moveTo(pr[0], pr[1])
      ctx.lineTo(pr[0], pr[1] - netH)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(pl[0], pl[1] - netH)
      ctx.quadraticCurveTo(vx, pl[1] - netH + 4 + sway, pr[0], pr[1] - netH)
      ctx.lineWidth = 2
      ctx.stroke()
      // mesh
      ctx.lineWidth = 0.6
      ctx.globalAlpha = 0.05 * colors.alpha
      const cells = 28
      for (let i = 1; i < cells; i++) {
        const x = pl[0] + ((pr[0] - pl[0]) * i) / cells
        ctx.beginPath()
        ctx.moveTo(x, pl[1] - netH + 2)
        ctx.lineTo(x, pl[1] - netH * 0.45)
        ctx.stroke()
      }
      for (let j = 0; j < 5; j++) {
        const y = pl[1] - netH + 2 + ((netH * 0.55) * j) / 4
        ctx.beginPath()
        ctx.moveTo(pl[0], y)
        ctx.lineTo(pr[0], y)
        ctx.stroke()
      }
      ctx.restore()
      return { horizon, depth, netTop: pl[1] - netH }
    }

    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const t = now / 1000
      pointer.x += (pointer.tx - pointer.x) * 0.04
      pointer.y += (pointer.ty - pointer.y) * 0.04
      ctx.clearRect(0, 0, w, h)

      // ceiling lamps
      const lamps = [
        [0.22, -0.05, 0.55],
        [0.8, -0.08, 0.5],
      ]
      lamps.forEach(([lx, ly, size], i) => {
        const breathe = 0.85 + Math.sin(t * 0.35 + i * 2) * 0.15
        const x = lx * w + pointer.x * -30
        const y = ly * h - scrollY * 0.15
        const r = Math.max(w, h) * size
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, colors.lamp)
        g.addColorStop(1, 'transparent')
        ctx.globalAlpha = 0.22 * breathe * colors.alpha
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
      })
      ctx.globalAlpha = 1

      const c = court(t)

      // dust motes in the light
      ctx.fillStyle = colors.dust
      for (const m of motes) {
        if (!reduce) {
          m.x += m.vx * dt * m.z
          m.y += m.vy * dt * m.z
          if (m.y < -0.05) {
            m.y = 1.05
            m.x = Math.random()
          }
          if (m.x < -0.05) m.x = 1.05
          if (m.x > 1.05) m.x = -0.05
        }
        const px = m.x * w + pointer.x * -60 * m.z
        const py = m.y * h + pointer.y * -40 * m.z - (scrollY * 0.1 * m.z) % h
        const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + m.tw)
        ctx.globalAlpha = (0.12 + 0.28 * tw) * m.z * colors.alpha
        ctx.beginPath()
        ctx.arc(px, ((py % h) + h) % h, m.r * m.z, 0, Math.PI * 2)
        ctx.fill()
      }

      // occasional serve over the net
      if (!reduce) {
        nextServe -= dt
        if (!serve && nextServe <= 0) {
          const ltr = Math.random() < 0.5
          serve = { t: 0, x0: ltr ? -0.1 : 1.1, x1: ltr ? 1.1 : -0.1, y0: c.horizon + c.depth * 0.25, peak: c.netTop - h * 0.18 }
          nextServe = 12 + Math.random() * 8
        }
        if (serve) {
          serve.t += dt / 2.6
          const trail = 22
          for (let i = 0; i < trail; i++) {
            const p = serve.t - i * 0.012
            if (p < 0 || p > 1) continue
            const x = (serve.x0 + (serve.x1 - serve.x0) * p) * w
            const y = serve.y0 + (serve.peak - serve.y0) * (1 - (2 * p - 1) ** 2)
            ctx.globalAlpha = (1 - i / trail) * 0.35 * colors.alpha * Math.sin(Math.PI * Math.min(1, serve.t))
            ctx.fillStyle = colors.ball
            ctx.beginPath()
            ctx.arc(x, y, i === 0 ? 4 : 2.2 * (1 - i / trail) + 0.4, 0, Math.PI * 2)
            ctx.fill()
          }
          if (serve.t > 1.3) serve = null
        }
      }
      ctx.globalAlpha = 1
      if (!reduce) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const themeObs = new MutationObserver(readColors)
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', readColors)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      themeObs.disconnect()
      mq.removeEventListener('change', readColors)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return <canvas ref={ref} className="ambient" aria-hidden />
}
