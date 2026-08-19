import { useEffect, useRef, useState } from 'react'
import { SPEECH_ERROR } from '../hooks/useSpeech'
import { COPY } from '../lib/messages'
import { getDisplayLabel, isBengali } from '../lib/languages'

const MAX_LENGTH = 500

/**
 * The one input surface at the bottom of the chat: type or hold-to-speak.
 *
 * Folds the old CapturePanel button and ManualInput disclosure into a single
 * messenger-style composer (design reference: the chat interpreter mock). The
 * mic is the primary control; a send arrow takes its place the moment there is
 * typed text. Both paths call the same translation entry point above.
 */

const SPEECH_ERROR_COPY = {
  [SPEECH_ERROR.UNSUPPORTED]: COPY.unsupportedBrowser,
  [SPEECH_ERROR.INSECURE_CONTEXT]:
    'Voice needs a secure connection. Open over HTTPS or on localhost.',
  [SPEECH_ERROR.PERMISSION_DENIED]: COPY.micDenied,
  [SPEECH_ERROR.NO_MICROPHONE]:
    'No microphone found. Check it is connected and not in use elsewhere.',
  [SPEECH_ERROR.NETWORK]: 'Speech recognition lost its connection. Try again.',
  [SPEECH_ERROR.PAUSED]: 'Listening paused. Tap the mic to resume.',
  [SPEECH_ERROR.UNKNOWN]: 'Voice input stopped unexpectedly. Try again.',
}

export default function Composer({
  isListening,
  isSupported,
  onStart,
  onStop,
  onSubmit,
  sourceLang,
  speechError,
}) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  const bengali = isBengali(sourceLang)
  const trimmed = text.trim()
  const message = speechError ? SPEECH_ERROR_COPY[speechError.code] ?? SPEECH_ERROR_COPY.UNKNOWN : null

  // Grow the textarea with its content up to a few lines, then scroll.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [text])

  const submit = () => {
    if (!trimmed) return
    onSubmit(trimmed)
    setText('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white/80 px-3 pb-4 pt-3 backdrop-blur-sm sm:px-4">
      {message && (
        <p role="alert" className="mb-2 px-2 text-center text-xs text-amber-700">
          {message}
        </p>
      )}

      {isListening && (
        <p className="mb-2 flex items-center justify-center gap-2 text-xs font-medium text-brand-700">
          <span className="flex h-1.5 w-1.5 rounded-full bg-red-500">
            <span className="h-full w-full animate-ping rounded-full bg-red-500" />
          </span>
          Listening in {getDisplayLabel(sourceLang)}
        </p>
      )}

      <div className="flex items-end gap-2 rounded-[26px] border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5 transition focus-within:border-brand-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={isListening ? 'Listening, or type…' : `Message in ${getDisplayLabel(sourceLang)}…`}
          aria-label={`Text to translate, in ${getDisplayLabel(sourceLang)}`}
          className={`max-h-32 flex-1 resize-none self-center bg-transparent py-1.5 text-slate-900 placeholder:text-slate-400 focus:outline-none ${
            bengali ? 'font-bn text-bn' : 'text-base'
          }`}
        />

        {trimmed ? (
          <button
            type="button"
            onClick={submit}
            aria-label="Send for translation"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white shadow-md shadow-brand-700/25 transition hover:bg-brand-800 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14m0 0-6-6m6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : isSupported ? (
          <button
            type="button"
            onClick={isListening ? onStop : onStart}
            aria-pressed={isListening}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md transition active:scale-95 ${
              isListening ? 'bg-slate-900 shadow-slate-900/25' : 'bg-brand-700 shadow-brand-700/25 hover:bg-brand-800'
            }`}
          >
            {isListening && (
              <span className="absolute inset-0 animate-ping rounded-full bg-slate-900/40" aria-hidden="true" />
            )}
            {isListening ? (
              <span className="relative h-3.5 w-3.5 rounded-[3px] bg-white" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
              </svg>
            )}
          </button>
        ) : null}
      </div>
    </div>
  )
}
