import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import {
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'

// A volleyball drawn entirely in a shader: six cube-projected panels, each split
// into three strips, with stitched seams. No textures to load.
const vert = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vObj = normal;
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

const frag = /* glsl */ `
  uniform vec3 uYellow;
  uniform vec3 uBlue;
  uniform vec3 uWhite;
  uniform vec3 uLight;
  uniform float uDark;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vView;

  vec3 stripColor(int face, float s) {
    int strip = s < -0.333 ? 0 : (s < 0.333 ? 1 : 2);
    bool mid = strip == 1;
    if (face == 0) return mid ? uBlue : uYellow;
    if (face == 1) return mid ? uWhite : uBlue;
    return mid ? uYellow : uWhite;
  }

  void main() {
    vec3 n = normalize(vObj);
    vec3 a = abs(n);
    int face;
    float s;
    float big;
    float mid;
    if (a.x >= a.y && a.x >= a.z) { face = 0; s = n.z / a.x; big = a.x; mid = max(a.y, a.z); }
    else if (a.y >= a.z) { face = 1; s = n.x / a.y; big = a.y; mid = max(a.x, a.z); }
    else { face = 2; s = n.y / a.z; big = a.z; mid = max(a.x, a.y); }

    vec3 base = stripColor(face, s);

    // seams: between strips and between panels
    float dStrip = min(abs(s - 0.333), abs(s + 0.333)) * big;
    float dPanel = (big - mid);
    float d = min(dStrip, dPanel);
    float w = fwidth(d) * 1.2;
    float seam = 1.0 - smoothstep(0.004, 0.004 + w, d);
    float groove = smoothstep(0.0, 0.06, d);

    vec3 N = normalize(vN);
    vec3 V = normalize(vView);
    vec3 L = normalize(uLight);
    float diff = max(dot(N, L), 0.0);
    float hemi = 0.5 + 0.5 * N.y;
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 48.0) * 0.35;
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    vec3 col = base * (0.32 + 0.78 * diff + 0.18 * hemi);
    col *= mix(0.72, 1.0, groove);
    col = mix(col, base * 0.25, seam * 0.85);
    col += spec;
    col += rim * mix(vec3(0.35, 0.45, 0.9), vec3(1.0, 0.85, 0.45), uDark) * 0.35;
    gl_FragColor = vec4(col, 1.0);
  }
`

export default function VolleyBall3D({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      el.classList.add('no-webgl')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    el.appendChild(renderer.domElement)

    const scene = new Scene()
    const camera = new PerspectiveCamera(32, 1, 0.1, 50)
    camera.position.set(0, 0, 4.4)

    const isDark = () => {
      const t = document.documentElement.getAttribute('data-theme')
      return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    const material = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uYellow: { value: new Vector3(1.0, 0.8, 0.2) },
        uBlue: { value: new Vector3(0.11, 0.28, 0.82) },
        uWhite: { value: new Vector3(0.96, 0.95, 0.91) },
        uLight: { value: new Vector3(-0.6, 0.9, 1.0) },
        uDark: { value: isDark() ? 1 : 0 },
      },
    })
    // fwidth needs derivatives in WebGL1; WebGL2 has them built in
    ;(material as unknown as { extensions: Record<string, boolean> }).extensions = { derivatives: true }

    const ball = new Mesh(new SphereGeometry(1, 128, 96), material)
    ball.rotation.set(0.5, -0.6, 0.2)
    scene.add(ball)

    const resize = () => {
      const { width, height } = el.getBoundingClientRect()
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    // pointer tilt
    const target = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    // click = spike: squash, big spin, settle
    const spin = { v: 0 }
    const onClick = () => {
      gsap.killTweensOf(ball.scale)
      gsap
        .timeline()
        .to(ball.scale, { x: 1.12, y: 0.86, z: 1.12, duration: 0.09, ease: 'power2.out' })
        .to(ball.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'elastic.out(1, 0.35)' })
      spin.v = 0.55
      el.dispatchEvent(new CustomEvent('spike', { bubbles: true }))
    }
    el.addEventListener('click', onClick)

    const themeObs = new MutationObserver(() => (material.uniforms.uDark.value = isDark() ? 1 : 0))
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    let visible = true
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
    io.observe(el)

    const drop = { y: reduce ? 0 : 2.2 }
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!visible) return
      const t = now / 1000
      spin.v *= 0.94
      ball.rotation.y += (reduce ? 0 : 0.18 + spin.v * 12) * dt
      ball.rotation.x += ((0.35 + target.y * 0.35) - ball.rotation.x) * 0.04
      ball.rotation.z += ((0.2 - target.x * 0.3) - ball.rotation.z) * 0.04
      const bob = reduce ? 0 : Math.sin(t * 1.4) * 0.06
      ball.position.y = bob + drop.y
      ball.position.x += (target.x * 0.08 - ball.position.x) * 0.05
      el.style.setProperty('--bob', String(bob))
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    gsap.to(drop, { y: 0, duration: 1.3, ease: 'bounce.out', delay: 0.15 })

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      themeObs.disconnect()
      window.removeEventListener('pointermove', onMove)
      el.removeEventListener('click', onClick)
      renderer.dispose()
      material.dispose()
      ball.geometry.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div ref={host} className={className} role="img" aria-label="Volleyball, zum Schmettern anklicken">
      <span className="ball-shadow" aria-hidden />
    </div>
  )
}
