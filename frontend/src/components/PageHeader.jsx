/**
 * Shared top bar for the standalone content pages (Help, Profile, Settings,
 * Blog, About, How we built it): brand mark on the left (back to home), a Back
 * link on the right. Keeps every page's chrome identical.
 */
export default function PageHeader({ onHome, onBack, backLabel = 'Back' }) {
  return (
    <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5 sm:px-8">
      <button type="button" onClick={onHome} className="flex items-center gap-2.5" title="Home">
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
        {backLabel}
      </button>
    </div>
  )
}
