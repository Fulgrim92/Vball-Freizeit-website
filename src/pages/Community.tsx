import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, FileSpreadsheet, FileText, MapPin, MessageCircle, Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { DOCUMENTS, EVENTS, FAQ, POSTS, TOURNAMENTS } from '../data/community'
import { fmtDate, fmtShort, NOW, relativeDay, weekdayOf } from '../data/season'
import { PageHead, Segmented, rise, stagger } from '../components/ui'

export function Termine() {
  const { toast } = useStore()
  const [joined, setJoined] = useState<Record<string, boolean>>({})
  const all = [
    ...TOURNAMENTS.map((t) => ({ kind: 'Turnier' as const, date: t.date, t })),
    ...EVENTS.map((e) => ({ kind: e.kind, date: e.date, e })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="wrap page">
      <PageHead eyebrow="Turniere & Termine" title="Was ansteht" />
      <motion.ol className="timeline" variants={stagger} initial="hidden" animate="show">
        {all.map((item) => {
          const d = new Date(item.date)
          const past = d < NOW
          return (
            <motion.li key={'t' in item ? item.t.id : item.e.id} className={`tl-item${past ? ' past' : ''}`} variants={rise}>
              <span className="tl-date">
                <b>{fmtShort(d)}</b>
                <small>
                  {weekdayOf(d)} · {d.getFullYear()}
                </small>
              </span>
              <span className={`tl-dot k-${item.kind.toLowerCase()}`} />
              {'t' in item ? (
                <div className="tl-card">
                  <span className="tag tag-turnier">Turnier</span>
                  <h3>{item.t.title}</h3>
                  <p className="muted with-icon">
                    <MapPin size={14} /> {item.t.place} · {item.t.format}
                  </p>
                  <div className="spots">
                    <div className="spots-bar">
                      <motion.i
                        initial={{ width: 0 }}
                        animate={{ width: `${((item.t.taken + (joined[item.t.id] ? 1 : 0)) / item.t.spots) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                      />
                    </div>
                    <span>
                      {item.t.spots - item.t.taken - (joined[item.t.id] ? 1 : 0)} von {item.t.spots} Plätzen frei
                    </span>
                    <button
                      className={`btn btn-sm ${joined[item.t.id] ? 'btn-ghost' : 'btn-primary'}`}
                      onClick={() => {
                        setJoined((j) => ({ ...j, [item.t.id]: !j[item.t.id] }))
                        toast(joined[item.t.id] ? 'Interesse zurückgezogen.' : `Interesse für „${item.t.title}“ vorgemerkt.`)
                      }}
                    >
                      {joined[item.t.id] ? 'Vorgemerkt ✓' : 'Interesse melden'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="tl-card">
                  <span className={`tag tag-${item.kind.toLowerCase()}`}>{item.kind}</span>
                  <h3>{item.e.title}</h3>
                  <p className="muted">{item.e.note}</p>
                </div>
              )}
            </motion.li>
          )
        })}
      </motion.ol>
    </div>
  )
}

export function CommunityPage() {
  const { user, toast } = useStore()
  const [tab, setTab] = useState<'boerse' | 'forum'>('boerse')
  const list = POSTS.filter((p) => p.kind === tab).sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="wrap page">
      <PageHead eyebrow="Community" title="Spielerbörse & Forum">
        <div className="toolbar">
          <Segmented
            id="comm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'boerse', label: 'Spielerbörse' },
              { value: 'forum', label: 'Diskussionsforum' },
            ]}
          />
          <button className="btn btn-primary btn-sm" onClick={() => toast(user ? 'Entwurf geöffnet (Demo).' : 'Zum Schreiben bitte anmelden.', 'info')}>
            <Plus size={16} /> {tab === 'boerse' ? 'Anzeige aufgeben' : 'Neues Thema'}
          </button>
        </div>
      </PageHead>
      <AnimatePresence mode="wait">
        <motion.div key={tab} className="post-list" variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0, y: 6 }}>
          {list.map((p) => (
            <motion.article key={p.id} className="post" variants={rise} whileHover={{ x: 4 }}>
              <div className="post-main">
                {p.tag && <span className={`tag tag-${p.tag.includes('sucht') && p.tag.startsWith('Team') ? 'team' : p.kind}`}>{p.tag}</span>}
                <h3>{p.title}</h3>
                <p className="muted">{p.excerpt}</p>
              </div>
              <div className="post-meta">
                <span>{p.author}</span>
                <span>{relativeDay(new Date(p.date))}</span>
                <span className="with-icon">
                  <MessageCircle size={14} /> {p.replies}
                </span>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function Infos() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="wrap page">
      <PageHead eyebrow="Infos" title="Fragen & Antworten" />
      <div className="infos-grid">
        <section className="faq">
          {FAQ.map((f, i) => (
            <div key={f.q} className={`faq-item${open === i ? ' open' : ''}`}>
              <button className="faq-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                <span>{f.q}</span>
                <motion.span animate={{ rotate: open === i ? 180 : 0 }}>
                  <ChevronDown size={18} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div className="faq-a" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                    <p>{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </section>
        <aside className="side-stack">
          <section className="panel" id="dokumente">
            <h2 className="panel-title">Dokumente</h2>
            <ul className="doc-list">
              {DOCUMENTS.map((d) => (
                <li key={d.title}>
                  {d.type === 'XLS' ? <FileSpreadsheet size={18} /> : <FileText size={18} />}
                  <span>{d.title}</span>
                  <small>
                    {d.type} · {d.size}
                  </small>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel" id="kontakt">
            <h2 className="panel-title">Kontakt</h2>
            <p className="muted">Staffelleitung Freizeitliga, Kreis München</p>
            <p className="mono small selectable">staffelleitung@example.org</p>
          </section>
          <section className="panel" id="impressum">
            <h2 className="panel-title">Impressum / Datenschutz</h2>
            <p className="muted small">Dieser Entwurf zeigt Beispieldaten. Stand {fmtDate(NOW)}.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}
