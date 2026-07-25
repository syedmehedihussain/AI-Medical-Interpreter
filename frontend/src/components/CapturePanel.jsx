import { SPEECH_ERROR } from '../hooks/useSpeech'
import { COPY } from '../lib/messages'
import { getDisplayLabel, isBengali } from '../lib/languages'

/**
 * Live capture -- prd.md F-2. The emotional centre of the interface.
 *
 * The signature element (design.md): speech arrives in two states, interim
 * (provisional, revised word by word) and final (settled). Most apps hide the
 * distinction. Here it is carried by WEIGHT and OPACITY, never by colour and
 * never by motion alone, so it survives colour blindness, a greyscale screen,
 * and prefers-reduced-motion.
 */

const SPEECH_ERROR_COPY = {
  [SPEECH_ERROR.UNSUPPORTED]: COPY.unsupportedBrowser,
  [SPEECH_ERROR.INSECURE_CONTEXT]:
    'Voice input needs a secure connection. Open this page over HTTPS or on localhost.',
  [SPEECH_ERROR.PERMISSION_DENIED]: COPY.micDenied,
  [SPEECH_ERROR.NO_MICROPHONE]:
    'No microphone available. Check that one is connected and that no other tab or app is using it, then try again.',
  [SPEECH_ERROR.NETWORK]:
    'Speech recognition lost its connection. Check your network and try again.',
  [SPEECH_ERROR.PAUSED]: 'Listening paused. Tap to resume.',
  [SPEECH_ERROR.UNKNOWN]: 'Voice input stopped unexpectedly. Try again.',
}

export default function CapturePanel({
  isListening,
  interimText,
  lastFinalText,
  error,
  isSupported,
  truncated,
  sourceLang,
  onStart,
  onStop,
}) {
  const bengali = isBengali(sourceLang)
  const scriptClass = bengali ? 'font-bn text-bn-lg' : 'text-xl'
  const message = error ? SPEECH_ERROR_COPY[error.code] ?? SPEECH_ERROR_COPY.UNKNOWN : null
  const hasCaption = Boolean(lastFinalText || interimText)

  return (
    <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6" aria-labelledby="capture-heading">
      <h2 id="capture-heading" className="sr-only">
        Speech capture
      </h2>

      {/* aria-live so the caption is announced as it grows (prd.md section 6). */}
      <div
        className="mb-5 min-h-[5rem] rounded-xl bg-slate-50 px-4 py-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {hasCaption ? (
          <p className={`${scriptClass} leading-relaxed`}>
            {/* Settled text: full weight, full opacity. */}
            {lastFinalText && <span className="font-semibold text-slate-900">{lastFinalText}</span>}
            {lastFinalText && interimText && ' '}
            {/* Provisional text: lighter weight, reduced opacity. Readable
                without colour, and identical under reduced motion. */}
            {interimText && (
              <span className="font-light text-slate-900/45">{interimText}</span>
            )}
          </p>
        ) : (
          <p className="text-base text-slate-400">
            {isListening
              ? `Listening in ${getDisplayLabel(sourceLang)}...`
              : `Tap below and speak in ${getDisplayLabel(sourceLang)}`}
          </p>
        )}
      </div>

      {truncated && (
        <p className="mb-3 text-xs text-amber-700">
          That was longer than 500 characters, so only the first part was translated.
        </p>
      )}

      {isSupported ? (
        <button
          type="button"
          onClick={isListening ? onStop : onStart}
          aria-pressed={isListening}
          className={`flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 text-lg font-semibold text-white transition active:scale-[0.99] ${
            isListening ? 'bg-slate-800 hover:bg-slate-900' : 'bg-sky-700 hover:bg-sky-800'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 rounded-full bg-white ${
              // Motion is a redundant cue only; the label already says which
              // state this is, and reduced-motion disables the animation.
              isListening ? 'animate-pulse' : ''
            }`}
            aria-hidden="true"
          />
          {isListening ? COPY.activeButton : COPY.idleButton}
        </button>
      ) : (
        // prd.md E-1: hide the button entirely rather than showing one that
        // cannot work. The typing path below stays fully usable.
        <p className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
          {COPY.unsupportedBrowser}
        </p>
      )}

      {message && isSupported && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
        >
          <p>{message}</p>
          {/* Raw browser code, for diagnosis. Chrome's own strings are the
              only way to tell a permission refusal from a build that has no
              speech service at all. Remove once Stage 6 is signed off. */}
          {error?.detail && (
            <p className="mt-1.5 font-mono text-[11px] text-amber-700/80">
              browser reported: {error.detail}
              {error.message ? ` (${error.message})` : ''}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
