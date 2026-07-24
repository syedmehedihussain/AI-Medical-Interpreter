import { getDisplayLabel, isBengali } from '../lib/languages'
import { COPY, messageForError } from '../lib/messages'

/**
 * The translation, plus its error and loading states -- prd.md F-3.
 *
 * The important rule here: the previous translation is NOT cleared while a new
 * request is in flight. An empty panel mid-consultation is worse than a stale
 * one, so loading is shown *beside* the old text rather than replacing it.
 */
export default function OutputPanel({ result, isLoading, error, targetLang, onRetry }) {
  const message = messageForError(error)
  const text = result?.translated_text
  const lang = result?.target_lang ?? targetLang
  const bengali = isBengali(lang)

  return (
    <section className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6" aria-labelledby="output-heading">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="output-heading" className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Translation
          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] uppercase text-slate-600">
            {getDisplayLabel(lang)}
          </span>
        </h2>

        {isLoading && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />
            Translating
          </span>
        )}
      </div>

      {/* aria-live so a screen reader announces a new translation without the
          user having to go looking for it (prd.md section 6). */}
      <div aria-live="polite" aria-atomic="true" className="min-h-[3.5rem]">
        {text ? (
          <p
            className={`${
              bengali ? 'font-bn text-bn-lg' : 'text-xl leading-relaxed'
            } font-medium text-slate-900 ${isLoading ? 'opacity-50' : ''} transition-opacity`}
          >
            {text}
          </p>
        ) : (
          !error && <p className="text-base text-slate-400">{COPY.outputPlaceholder}</p>
        )}
      </div>

      {message && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5"
        >
          <span className="mt-0.5 text-sm font-bold text-red-700" aria-hidden="true">!</span>
          <p className="flex-1 text-sm text-red-800">{message}</p>
          {/* prd.md E-13 and E-15: retryable failures get a retry control. */}
          {error?.retryable && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 rounded border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </section>
  )
}
