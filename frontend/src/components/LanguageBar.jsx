import { LANGUAGES, getDisplayLabel, getOther, isBengali } from '../lib/languages'

/**
 * Source and target selectors with a swap control -- prd.md F-1.
 *
 * The swap is used every time the conversation changes direction, so per
 * design.md it is the second most prominent control on the page.
 *
 * Selecting the same language on both sides is impossible by construction:
 * picking a language on one side auto-swaps the other. There is no invalid
 * state to validate against, because it cannot be reached.
 */
function LanguageSelect({ id, legend, value, onChange }) {
  return (
    <div className="flex-1">
      <label htmlFor={id} className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {legend}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-medium text-slate-900 ${
          isBengali(value) ? 'font-bn text-bn' : 'text-base'
        }`}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {getDisplayLabel(lang.code)}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function LanguageBar({ sourceLang, targetLang, onChange }) {
  const swap = () => onChange({ sourceLang: targetLang, targetLang: sourceLang })

  return (
    <div className="flex items-end gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:gap-3 sm:px-6">
      <LanguageSelect
        id="source-lang"
        legend="From"
        value={sourceLang}
        // Picking a source auto-moves the target, so they can never match.
        onChange={(code) => onChange({ sourceLang: code, targetLang: getOther(code) })}
      />

      <button
        type="button"
        onClick={swap}
        aria-label={`Swap languages: translate ${getDisplayLabel(targetLang)} to ${getDisplayLabel(sourceLang)} instead`}
        title="Swap languages"
        className="mb-0.5 shrink-0 rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-slate-700 transition hover:bg-slate-100 active:scale-95"
      >
        {/* aria-hidden: the button already has an accessible label. */}
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 7h12m0 0-3-3m3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 13H4m0 0 3 3m-3-3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <LanguageSelect
        id="target-lang"
        legend="To"
        value={targetLang}
        onChange={(code) => onChange({ sourceLang: getOther(code), targetLang: code })}
      />
    </div>
  )
}
