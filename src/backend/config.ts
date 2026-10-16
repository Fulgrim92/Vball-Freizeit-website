/**
 * Which data the site runs on. With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set at build
 * time it talks to Supabase; without them it is the self-contained demo (mock season, demo
 * logins, localStorage), which is what the shareable preview link uses.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const BACKEND: 'supabase' | 'demo' = SUPABASE_URL && SUPABASE_ANON_KEY ? 'supabase' : 'demo'
