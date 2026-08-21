import { useCallback, useEffect, useState } from 'react'
import { deleteAccount as apiDeleteAccount } from '../api/client'
import { isAuthConfigured, supabase } from '../lib/supabase'

/**
 * Authentication state and actions, wrapping Supabase Auth.
 *
 * Exposes the current session/user (or null for a guest), the access token to
 * send to our API, and email/password sign-up, sign-in, and sign-out. When
 * Supabase is not configured, it reports `configured: false` and stays in the
 * guest state so the rest of the app is unaffected.
 *
 * Errors are returned (not thrown) as `{ error }` so the caller -- the auth
 * modal -- can show a message inline without a try/catch.
 */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isAuthConfigured)

  useEffect(() => {
    if (!supabase) return undefined
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session ?? null)
        setLoading(false)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null)
    })
    return () => {
      active = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  // `profile` (full_name, date_of_birth) is stored in Supabase user_metadata via
  // options.data -- no separate profiles table for the demo.
  const signUp = useCallback(async (email, password, profile) => {
    if (!supabase) return { error: 'Sign-up is not available.' }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: profile ? { data: profile } : undefined,
    })
    // No session on success means the project requires email confirmation.
    return { error: error?.message ?? null, needsConfirmation: !error && !data?.session }
  }, [])

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: 'Sign-in is not available.' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  /** Update profile fields (full_name, date_of_birth) in user_metadata. */
  const updateProfile = useCallback(async (data) => {
    if (!supabase) return { error: 'Not available.' }
    const { error } = await supabase.auth.updateUser({ data })
    return { error: error?.message ?? null }
  }, [])

  /** Change the account password for the signed-in user. */
  const updatePassword = useCallback(async (password) => {
    if (!supabase) return { error: 'Not available.' }
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error?.message ?? null }
  }, [])

  /**
   * Permanently delete the account (server-side) then sign out locally. The
   * backend removes the user and their reports; we clear the local session so
   * the app drops back to guest state.
   */
  const deleteAccount = useCallback(async () => {
    if (!supabase) return { error: 'Not available.' }
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return { error: 'You are not signed in.' }
    try {
      await apiDeleteAccount({ token })
    } catch (err) {
      return { error: err?.message || 'Could not delete your account. Try again.' }
    }
    await supabase.auth.signOut()
    return { error: null }
  }, [])

  /**
   * A fresh access token for an authed API call.
   *
   * The token cached in state can expire while the tab sits idle, so callers
   * should fetch one right before a request rather than reuse the prop. This
   * reads the current session and refreshes it when the token is within 30s of
   * expiry, so requests never go out with a stale token.
   */
  const getToken = useCallback(async () => {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    let current = data.session
    if (!current) return null
    const now = Math.floor(Date.now() / 1000)
    if (current.expires_at && current.expires_at <= now + 30) {
      const { data: refreshed } = await supabase.auth.refreshSession()
      current = refreshed.session ?? current
    }
    return current?.access_token ?? null
  }, [])

  return {
    configured: isAuthConfigured,
    loading,
    user: session?.user ?? null,
    accessToken: session?.access_token ?? null,
    getToken,
    signUp,
    signIn,
    signOut,
    updateProfile,
    updatePassword,
    deleteAccount,
  }
}
