import { useEffect, useState } from 'react'
import { listReports } from '../api/client'
import PageHeader from './PageHeader'
import { Reveal } from './motion'

function Card({ title, desc, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {desc && <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400'

export default function Profile({
  name,
  email,
  dob,
  getToken,
  onSaveProfile,
  onChangePassword,
  onDeleteAccount,
  onReports,
  onHome,
  onBack,
}) {
  const [fullName, setFullName] = useState(name || '')
  const [birth, setBirth] = useState(dob || '')
  const [savedNote, setSavedNote] = useState(null)
  const [profileErr, setProfileErr] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwNote, setPwNote] = useState(null)
  const [pwErr, setPwErr] = useState(null)
  const [savingPw, setSavingPw] = useState(false)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteErr, setDeleteErr] = useState(null)

  const [usage, setUsage] = useState({ loading: true, count: 0, last: null })

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error('no token')
        const data = await listReports({ token })
        if (!active) return
        const reports = data?.reports ?? []
        setUsage({ loading: false, count: reports.length, last: reports[0]?.created_at ?? null })
      } catch {
        if (active) setUsage({ loading: false, count: 0, last: null })
      }
    })()
    return () => {
      active = false
    }
  }, [getToken])

  const saveProfile = async (e) => {
    e.preventDefault()
    if (savingProfile) return
    setProfileErr(null)
    setSavedNote(null)
    if (!fullName.trim()) {
      setProfileErr('Name cannot be empty.')
      return
    }
    setSavingProfile(true)
    const { error } = await onSaveProfile({ full_name: fullName.trim(), date_of_birth: birth })
    setSavingProfile(false)
    if (error) setProfileErr(error)
    else setSavedNote('Profile updated.')
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (savingPw) return
    setPwErr(null)
    setPwNote(null)
    if (password.length < 6) {
      setPwErr('Use at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setPwErr('Passwords do not match.')
      return
    }
    setSavingPw(true)
    const { error } = await onChangePassword(password)
    setSavingPw(false)
    if (error) {
      setPwErr(error)
      return
    }
    setPassword('')
    setConfirm('')
    setPwNote('Password changed.')
  }

  const deleteNow = async () => {
    if (deleting) return
    setDeleting(true)
    setDeleteErr(null)
    const { error } = await onDeleteAccount()
    setDeleting(false)
    if (error) setDeleteErr(error)
    // On success, App drops to guest and navigates away.
  }

  const lastLabel = usage.last ? new Date(usage.last).toLocaleDateString() : '—'

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader onHome={onHome} onBack={onBack} />
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-4 sm:px-8">
        <Reveal>
          <h1 className="font-serif text-3xl font-semibold text-slate-900 sm:text-4xl">Your profile</h1>
          <p className="mt-2 text-[15px] text-slate-500">Manage your details, security, and account.</p>
        </Reveal>

        <div className="mt-8 space-y-5">
          <Reveal>
            <Card title="Details" desc="Stored with your account and used on saved reports.">
              <form onSubmit={saveProfile} className="space-y-4">
                <Field label="Full name">
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Date of birth">
                    <input type="date" max={new Date().toISOString().slice(0, 10)} value={birth} onChange={(e) => setBirth(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={email || ''} disabled className={inputClass} />
                  </Field>
                </div>
                {profileErr && <p className="text-[13px] text-clay-600">{profileErr}</p>}
                {savedNote && <p className="text-[13px] text-brand-700">{savedNote}</p>}
                <button type="submit" disabled={savingProfile} className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40">
                  {savingProfile ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </Card>
          </Reveal>

          <Reveal>
            <Card title="Usage">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-3xl font-extrabold text-slate-900">{usage.loading ? '—' : usage.count}</p>
                  <p className="mt-1 text-[13px] text-slate-500">Saved reports</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-3xl font-extrabold text-slate-900">{usage.loading ? '—' : lastLabel}</p>
                  <p className="mt-1 text-[13px] text-slate-500">Last consultation</p>
                </div>
              </div>
              <button type="button" onClick={onReports} className="mt-4 text-sm font-semibold text-brand-700 transition hover:text-brand-800">
                View my reports →
              </button>
            </Card>
          </Reveal>

          <Reveal>
            <Card title="Password" desc="Change the password you use to sign in.">
              <form onSubmit={changePassword} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="New password">
                    <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Confirm password">
                    <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
                  </Field>
                </div>
                {pwErr && <p className="text-[13px] text-clay-600">{pwErr}</p>}
                {pwNote && <p className="text-[13px] text-brand-700">{pwNote}</p>}
                <button type="submit" disabled={savingPw} className="rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-40">
                  {savingPw ? 'Saving…' : 'Change password'}
                </button>
              </form>
            </Card>
          </Reveal>

          <Reveal>
            <section className="rounded-3xl border border-clay-200 bg-clay-50/40 p-6 sm:p-7">
              <h2 className="text-lg font-bold text-clay-800">Delete account</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-clay-700/80">
                Permanently removes your account and all saved reports. This cannot be undone.
              </p>
              {deleteErr && <p className="mt-3 text-[13px] text-clay-700">{deleteErr}</p>}
              {confirmingDelete ? (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-clay-800">Are you sure?</span>
                  <button type="button" onClick={deleteNow} disabled={deleting} className="rounded-full bg-clay-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-clay-700 disabled:opacity-40">
                    {deleting ? 'Deleting…' : 'Delete permanently'}
                  </button>
                  <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting} className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmingDelete(true)} className="mt-5 rounded-full border border-clay-300 bg-white px-5 py-2.5 text-sm font-semibold text-clay-700 transition hover:bg-clay-50">
                  Delete my account
                </button>
              )}
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
