import { getDisplayLabel, isBengali } from '../lib/languages'
import { COPY, messageForError } from '../lib/messages'

/**
 * The translation, plus its error and loading states -- prd.md F-3.
 *
 * The important rule here: the previous translation is NOT cleared while a new
 * request is in flight. An empty panel mid-consultation is worse than a stale
 * one, so loading is shown *beside* the old text rather than replacing it.
 */
export default function OutputPanel({
  result,
  isLoading,
  error,
  targetLang,
  onRetry,
  onSpeak,
  isSpeaking,
  hasVoice,
  autoplay,
  onAutoplayChange,
}) {
  const message = messageForError(error)
  const text = result?.translated_text
  const lang = result?.target_lang ?? targetLang
  const bengali = isBengali(lang)

  return (
    <section className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6" aria-labelledby="output-heading">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="output-heading" className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Translation
          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] uppercase text-slate-600">
            {getDisplayLabel(lang)}
          </span>
        </h2>

        <div className="flex items-center gap-3">
          {isLoading && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />
              Translating
            </span>
          )}

          {/* prd.md F-4: autoplay is on by default, because the clinical use
              case is hands-free, with a toggle to turn it off. */}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(event) => onAutoplayChange(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-700"
            />
            Auto-play
          </label>

          <button
            type="button"
            onClick={() => text && onSpeak(text)}
            // prd.md E-21: disabled with an explanation when the system has no
            // voice for this language. The text is still readable, so this is
            // a degraded state, not a failure.
            disabled={!text || !hasVoice}
            title={
              hasVoice
                ? 'Read the translation aloud'
                : `No ${getDisplayLabel(lang)} voice is installed on this device. The text above is still readable.`
            }
            aria-label={
              hasVoice
                ? 'Read the translation aloud'
                : `Speech unavailable: no ${getDisplayLabel(lang)} voice installed on this device`
            }
            className="rounded-lg border border-slate-300 p-1.5 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M4 8v4h3l4 3V5L7 8H4z" strokeLinejoin="round" />
              {hasVoice ? (
                <path
                  d={isSpeaking ? 'M14 6.5a5 5 0 0 1 0 7M16.5 4.5a8 8 0 0 1 0 11' : 'M14 7.5a3.5 3.5 0 0 1 0 5'}
                  strokeLinecap="round"
                />
              ) : (
                <path d="M14 8l4 4m0-4l-4 4" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
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

      {/* prd.md E-21 made visible rather than hidden in a tooltip. Silence
          with no explanation reads as a broken feature; this says what is
          missing and that the text is still usable. */}
      {text && !hasVoice && (
        <p className="mt-2 text-xs text-slate-500">
          No {getDisplayLabel(lang)} voice is installed on this device, so the translation
          is not read aloud. The text above is still correct.
        </p>
      )}

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
