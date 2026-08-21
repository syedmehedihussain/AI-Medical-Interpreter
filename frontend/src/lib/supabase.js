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

// Trim to survive copy-paste whitespace in dashboard env vars (Vercel/Render).
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// A present-but-malformed URL still makes createClient THROW, which would crash
// the whole React tree at import time (blank page). Guard the shape ourselves so
// a bad env var degrades to guest-only instead of white-screening.
const hasValidUrl = Boolean(url && /^https?:\/\//i.test(url))

export const isAuthConfigured = hasValidUrl && Boolean(anonKey)

function createSupabaseClient() {
  if (!isAuthConfigured) {
    if (url && !hasValidUrl) {
      // eslint-disable-next-line no-console
      console.error(
        `[supabase] VITE_SUPABASE_URL is set but not a valid http(s) URL: "${url}". ` +
          'Running guest-only. Fix the env var (include the https:// protocol).',
      )
    }
    return null
  }
  try {
    return createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[supabase] Failed to init client, running guest-only:', err)
    return null
  }
}

export const supabase = createSupabaseClient()
