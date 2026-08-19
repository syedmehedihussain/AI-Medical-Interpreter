import StatusDot from './StatusDot'

/** App header: back to home, the name, and the engine status (prd.md section 2). */
export default function Header({ status, onBack }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6">
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to home"
            className="-ml-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-700 text-white" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 3v18M3 12h18" strokeLinecap="round" />
          </svg>
        </span>
        <h1 className="text-base font-bold tracking-tight text-slate-900">AI Medical Interpreter</h1>
      </div>
      <StatusDot status={status} />
    </header>
  )
}
