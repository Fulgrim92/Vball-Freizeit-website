import { BACKEND } from './config'

export { BACKEND } from './config'
export type Remote = typeof import('./remote')

/** The Supabase layer once connect() has run; null on the demo. */
export let remote: Remote | null = null

/** Loads the Supabase layer and swaps in the database's season. Call before rendering. */
export async function connect() {
  if (BACKEND !== 'supabase') return
  const r = await import('./remote')
  await r.loadSeason()
  remote = r
}
