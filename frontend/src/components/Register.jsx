import { useState } from 'react'
import { Reveal } from './motion'

/**
 * Full-page registration.
 *
 * Same fields as the Create-account modal (full name, date of birth, email,
 * password), reached from the home page's "Get started". On a clean sign-up it
 * calls onRegistered (App sends the user into the tool). A "Try the demo" button
 * enters the interpreter as a guest with nothing saved, and the login link opens
 * the existing modal. Profile fields go to Supabase user_metadata via onSignUp.
 */
export default function Register({ onSignUp, onRegistered, onDemo, onLogin, onBack }) {
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [note, setNote] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setNote(null)
    if (!fullName.trim() || !dob) {
      setError('Enter your full name and date of birth.')
      return
    }
    if (!email.trim() || !password) {
      setError('Enter your email and a password.')
      return
    }
    setBusy(true)
    const result = await onSignUp(email.trim(), password, {
      full_name: fullName.trim(),
      date_of_birth: dob,
    })
    setBusy(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    if (result?.needsConfirmation) {
      // Project requires email confirmation: no session yet, so we can't enter
      // the tool. Tell them to confirm, then log in.
      setNote('Account created. Check your email to confirm, then log in.')
      return
    }
    onRegistered()
  }

  return (
    <div className="grain relative min-h-[100dvh] overflow-hidden bg-canvas">
      <div
        aria-hidden="true"
        className="blob animate-float pointer-events-none absolute -right-24 -top-24 h-72 w-72 bg-brand-300/40 sm:h-[26rem] sm:w-[26rem]"
      />

      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <button type="button" onClick={onBack} className="flex items-center gap-2.5" title="Back to home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3v18M3 12h18" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-[15px] font-bold tracking-tight text-slate-900">AI Medical Interpreter</span>
        </button>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home
        </button>
      </div>

      <div className="relative mx-auto flex max-w-md flex-col px-6 pb-16 pt-4 sm:pt-8">
        <Reveal className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/[0.06] sm:p-8">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-slate-900">Create your account</h1>
              <p className="text-[13px] text-slate-500">Save consultations to your account.</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3">
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
                autoComplete="new-password"
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
              {busy ? 'Please wait…' : 'Create account'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={onDemo}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Try the demo
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 10h12m0 0-5-5m5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="mt-2 text-center text-[12px] text-slate-400">No account needed. Nothing is saved in the demo.</p>

          <p className="mt-5 text-center text-[13px] text-slate-500">
            Already have an account?{' '}
            <button type="button" onClick={onLogin} className="font-semibold text-brand-700 hover:text-brand-800">
              Log in
            </button>
          </p>
        </Reveal>
      </div>
    </div>
  )
}
