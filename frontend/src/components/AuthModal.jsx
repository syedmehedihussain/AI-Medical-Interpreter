import { useState } from 'react'

/**
 * Email/password login + sign-up modal.
 *
 * One overlay with a Log in / Sign up toggle. It calls the handlers from
 * useAuth, which return `{ error }` (and `{ needsConfirmation }` for sign-up),
 * so failures show inline. On a successful login the parent closes the modal by
 * watching the auth state; sign-up that needs email confirmation shows a note
 * here instead.
 */
export default function AuthModal({ onClose, onSignIn, onSignUp, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [error, setError] = useState(null)
  const [note, setNote] = useState(null)
  const [busy, setBusy] = useState(false)

  const isLogin = mode === 'login'

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setNote(null)
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    if (!isLogin && (!fullName.trim() || !dob)) {
      setError('Enter your full name and date of birth.')
      return
    }
    setBusy(true)
    const result = isLogin
      ? await onSignIn(email.trim(), password)
      : await onSignUp(email.trim(), password, { full_name: fullName.trim(), date_of_birth: dob })
    setBusy(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    if (!isLogin && result?.needsConfirmation) {
      setNote('Account created. Check your email to confirm, then log in.')
      setMode('login')
      setPassword('')
    }
    // On success with a session, the parent closes this modal via auth state.
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" aria-label={isLogin ? 'Log in' : 'Sign up'} className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h2 className="font-serif text-xl font-semibold text-slate-900">{isLogin ? 'Log in' : 'Create account'}</h2>
            <p className="text-[13px] text-slate-500">Save consultations to your account.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {!isLogin && (
            <>
              <label className="block">
                <span className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Full name</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Date of birth</span>
                <input
                  type="date"
                  autoComplete="bday"
                  max={new Date().toISOString().slice(0, 10)}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
            </>
          )}
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Password</span>
            <input
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>

          {error && <p className="text-[13px] text-clay-600">{error}</p>}
          {note && <p className="text-[13px] text-brand-700">{note}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-slate-500">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isLogin ? 'signup' : 'login')
              setError(null)
              setNote(null)
            }}
            className="font-semibold text-brand-700 hover:text-brand-800"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
