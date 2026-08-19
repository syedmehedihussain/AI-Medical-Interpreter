import { LANGUAGES, getDisplayLabel, getOther, isBengali } from '../lib/languages'

/**
 * Compact translation-direction control that sits under the header.
 *
 * A minimal pill: source, a swap, target, plus autoplay and clear. Replaces the
 * old full-width From/To panel so the chat stream stays the focus. Picking a
 * language on one side auto-swaps the other, so the pair can never match.
 */
function Picker({ label, value, onChange }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`cursor-pointer appearance-none rounded-full bg-transparent py-1 pl-3 pr-7 text-sm font-semibold text-slate-800 hover:bg-slate-100 ${
          isBengali(value) ? 'font-bn' : ''
        }`}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {getDisplayLabel(lang.code)}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 20 20" className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
      >
        <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export default function DirectionBar({
  sourceLang,
  targetLang,
  onChange,
  autoplay,
  onAutoplayChange,
  onClear,
  hasEntries,
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
      <div className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5">
        <Picker
          label="Translate from"
          value={sourceLang}
          onChange={(code) => onChange({ sourceLang: code, targetLang: getOther(code) })}
        />
        <button
          type="button"
          onClick={() => onChange({ sourceLang: targetLang, targetLang: sourceLang })}
          aria-label={`Swap: translate ${getDisplayLabel(targetLang)} to ${getDisplayLabel(sourceLang)}`}
          title="Swap direction"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand-700 transition hover:bg-brand-50 active:scale-90"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 7h12m0 0-3-3m3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 13H4m0 0 3 3m-3-3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Picker
          label="Translate to"
          value={targetLang}
          onChange={(code) => onChange({ sourceLang: getOther(code), targetLang: code })}
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onAutoplayChange(!autoplay)}
          aria-pressed={autoplay}
          title={autoplay ? 'Auto-play is on' : 'Auto-play is off'}
          aria-label={autoplay ? 'Turn auto-play off' : 'Turn auto-play on'}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
            autoplay ? 'bg-brand-50 text-brand-700' : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M4 8v4h3l4 3V5L7 8H4z" strokeLinejoin="round" />
            {autoplay ? (
              <path d="M14 6.5a5 5 0 0 1 0 7M12.5 8a3 3 0 0 1 0 4" strokeLinecap="round" />
            ) : (
              <path d="M13 8l4 4m0-4l-4 4" strokeLinecap="round" />
            )}
          </svg>
        </button>
        {hasEntries && (
          <button
            type="button"
            onClick={onClear}
            title="Clear this session"
            aria-label="Clear this session"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M4 6h12M8 6V4h4v2m-6 0 1 10h6l1-10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
