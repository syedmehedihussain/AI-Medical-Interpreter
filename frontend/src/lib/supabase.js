/**
 * The Supabase browser client, used ONLY for authentication.
 *
 * Data (saved reports) never goes through here -- it goes through our FastAPI
 * with the user's access token, which is the backend-mediated design. supabase-js
 * handles sign-up / sign-in / session persistence and hands us the JWT to send.
 *
 * The client is created only when both env vars are present. When they are
 * absent (a fresh clone with no Supabase project) `supabase` is null and the app
 * runs guest-only: the auth UI is hidden and nothing is saved. So a missing
 * config degrades gracefully instead of throwing at import.
 */

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isAuthConfigured = Boolean(url && anonKey)

export const supabase = isAuthConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
