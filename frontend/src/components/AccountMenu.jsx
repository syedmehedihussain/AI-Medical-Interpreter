import { useEffect, useRef, useState } from 'react'

/**
 * Signed-in account dropdown, shared by the Home and Studio headers.
 *
 * A compact trigger (initial + name/email) opens a menu with Profile, Settings,
 * My reports and Log out. Closes on outside click or Escape.
 */
export default function AccountMenu({ email, name, onProfile, onSettings, onReports, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = name || email || 'Account'
  const initial = (name || email || '?').trim().charAt(0).toUpperCase()

  const run = (fn) => () => {
    setOpen(false)
    fn?.()
  }

  const items = [
    ['Profile', onProfile, 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0'],
    ['Settings', onSettings, 'M10.3 4h3.4l.5 2.3 2 .8 2-1.2 2.4 2.4-1.2 2 .8 2 2.3.5v3.4l-2.3.5-.8 2 1.2 2-2.4 2.4-2-1.2-2 .8-.5 2.3h-3.4l-.5-2.3-2-.8-2 1.2L3 17.6l1.2-2-.8-2L1 13.1V9.7l2.3-.5.8-2-1.2-2L5.3 2.8l2 1.2 2-.8L10.3 4zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z'],
    ['My reports', onReports, 'M6 3h8l4 4v14H6zM14 3v4h4M8 12h8M8 16h6'],
  ]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50/40"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[140px] truncate sm:inline">{label}</span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/[0.08]"
        >
          {email && (
            <p className="truncate px-3 pb-2 pt-1.5 text-xs text-slate-400" title={email}>{email}</p>
          )}
          {items.map(([text, fn, d]) => (
            <button
              key={text}
              type="button"
              role="menuitem"
              onClick={run(fn)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d={d} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {text}
            </button>
          ))}
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={run(onLogout)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
