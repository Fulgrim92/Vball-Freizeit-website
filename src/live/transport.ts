import type { LiveGame } from './engine'

export type LiveSnapshot = Record<string, LiveGame>

/**
 * Where live games come from and go to. The demo ships a browser-only transport so the
 * prototype works as a static page; src/backend/remote.ts implements the same calls on a
 * Supabase realtime channel over the `live_games` table, where row-level security checks
 * what the client only checks for UX: that the reporter holds the "Ergebnisse" right for
 * the match's home team.
 */
export interface LiveTransport {
  load(): LiveSnapshot
  publish(game: LiveGame): void
  remove(matchId: string): void
  /** called with the full snapshot whenever another tab or device changes something */
  subscribe(cb: (games: LiveSnapshot) => void): () => void
  /** called when the server refused a write; the snapshot has been reset to the server's state */
  onError?(cb: (message: string) => void): () => void
}

const KEY = 'vfm:live'
const DAY = 24 * 3600 * 1000

function read(): LiveSnapshot {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}') as LiveSnapshot
    // forget abandoned demo sessions
    return Object.fromEntries(Object.entries(all).filter(([, g]) => Date.now() - g.updatedAt < DAY))
  } catch {
    return {}
  }
}

function write(games: LiveSnapshot) {
  try {
    localStorage.setItem(KEY, JSON.stringify(games))
  } catch {
    /* storage unavailable: still works within this tab */
  }
}

/** Shares live games between tabs of this browser via localStorage + BroadcastChannel. */
export function createLocalTransport(): LiveTransport {
  let memory = read()
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('vfm-live') : null
  const listeners = new Set<(g: LiveSnapshot) => void>()
  const emit = () => listeners.forEach((cb) => cb({ ...memory }))
  const commit = () => {
    write(memory)
    channel?.postMessage(memory)
  }
  // last write wins per game
  const merge = (incoming: LiveSnapshot) => {
    const next: LiveSnapshot = {}
    for (const id of new Set([...Object.keys(memory), ...Object.keys(incoming)])) {
      const a = memory[id]
      const b = incoming[id]
      if (a && b) next[id] = b.updatedAt >= a.updatedAt ? b : a
      else if (b) next[id] = b
    }
    memory = next
    emit()
  }
  channel?.addEventListener('message', (e) => merge(e.data as LiveSnapshot))
  window.addEventListener('storage', (e) => e.key === KEY && merge(read()))

  return {
    load: () => ({ ...memory }),
    publish(game) {
      memory = { ...memory, [game.matchId]: game }
      commit()
      emit()
    },
    remove(id) {
      const rest = { ...memory }
      delete rest[id]
      memory = rest
      commit()
      emit()
    },
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}
