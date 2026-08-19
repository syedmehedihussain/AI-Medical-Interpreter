import { useEffect, useRef } from 'react'
import { getDisplayLabel, isBengali } from '../lib/languages'
import { messageForError } from '../lib/messages'

/**
 * The chat stream.
 *
 * Deliberately NOT a two-person messenger. Each turn is a linked pair: what the
 * speaker said (a plain bubble, right) and that same meaning rendered in the
 * other language (a green "translation" bubble, left, tagged with the direction
 * and a replay control). The interpreter only ever "talks" once, the opening
 * greeting; everything after is the user's own words transformed. That framing
 * is what keeps it from reading as a conversation with a chatbot.
 */

const INTRO =
  "Hello, I'm your medical interpreter. Speak or type in English or Bangla and I'll render it in the other language right away. What would you like to say?"

function Avatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 3v18M3 12h18" strokeLinecap="round" />
      </svg>
    </span>
  )
}

function TranslateGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h10M9 5v2M6 7c0 4-2 6-4 7m2-3c1 1 3 2 4 2M13 19l4-9 4 9m-6.5-2.5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** What the speaker said. Neutral bubble, aligned to the input side (right). */
function SourceBubble({ text, lang, inputMode, faded }) {
  const bengali = isBengali(lang)
  return (
    <div className="flex justify-end">
      <div className={`max-w-[82%] animate-rise-in rounded-2xl rounded-br-md border border-slate-200 bg-white px-4 py-2.5 ${faded ? 'opacity-60' : ''}`}>
        <div className="mb-1 flex items-center justify-end gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {inputMode === 'voice' ? (
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
            </svg>
          ) : null}
          {getDisplayLabel(lang)}
        </div>
        <p className={`${bengali ? 'font-bn text-bn' : 'text-[15px]'} leading-relaxed text-slate-800`}>{text}</p>
      </div>
    </div>
  )
}

/** The translation. Prominent green bubble with the direction and a replay. */
function TranslationBubble({ text, lang, fromLang, onSpeak, hasVoice, isSpeaking }) {
  const bengali = isBengali(lang)
  return (
    <div className="mt-1.5 flex justify-start">
      <div className="max-w-[82%] animate-rise-in rounded-2xl rounded-bl-md bg-brand-600 px-4 py-3 text-white shadow-sm shadow-brand-700/20">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/80">
          <TranslateGlyph />
          {getDisplayLabel(fromLang)} <span className="text-white/50">&rarr;</span> {getDisplayLabel(lang)}
        </div>
        <div className="flex items-start gap-3">
          <p className={`${bengali ? 'font-bn text-bn-lg' : 'text-lg leading-relaxed'} flex-1 font-medium`}>{text}</p>
          <button
            type="button"
            onClick={() => onSpeak(text)}
            disabled={!hasVoice}
            aria-label={hasVoice ? 'Play translation aloud' : `No ${getDisplayLabel(lang)} voice on this device`}
            title={hasVoice ? 'Play aloud' : `No ${getDisplayLabel(lang)} voice installed; the text is still correct`}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M4 8v4h3l4 3V5L7 8H4z" strokeLinejoin="round" />
              <path d={isSpeaking ? 'M14 6.5a5 5 0 0 1 0 7' : 'M14 7.5a3.5 3.5 0 0 1 0 5'} strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/** The "typing" state, reframed: the interpreter is translating, not chatting. */
function TranslatingBubble() {
  return (
    <div className="mt-1.5 flex justify-start" aria-live="polite">
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-brand-50 px-4 py-3 text-brand-800">
        <span className="text-xs font-medium">Translating</span>
        <span className="flex gap-1" aria-hidden="true">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}

function ErrorBubble({ message, retryable, onRetry }) {
  return (
    <div className="mt-1.5 flex justify-start" role="alert">
      <div className="flex max-w-[82%] items-center gap-3 rounded-2xl rounded-bl-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <span>{message}</span>
        {retryable && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-800 transition hover:bg-red-100"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

export default function Conversation({
  entries,
  pending,
  isTranslating,
  error,
  onRetry,
  liveText,
  isListening,
  sourceLang,
  onSpeak,
  isSpeaking,
  hasVoice,
}) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries.length, isTranslating, isListening, liveText, error])

  const errorMessage = messageForError(error)

  return (
    <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-5">
      {/* Opening greeting, the one time the interpreter speaks for itself. */}
      <div className="mb-5 flex items-start gap-2.5">
        <Avatar />
        <div className="max-w-[85%] animate-rise-in rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3">
          <p className="text-[15px] leading-relaxed text-slate-700">{INTRO}</p>
        </div>
      </div>

      <div className="space-y-5">
        {entries.map((entry) => (
          <div key={entry.id}>
            <SourceBubble text={entry.sourceText} lang={entry.sourceLang} inputMode={entry.inputMode} />
            <TranslationBubble
              text={entry.translatedText}
              lang={entry.targetLang}
              fromLang={entry.sourceLang}
              onSpeak={onSpeak}
              hasVoice={hasVoice}
              isSpeaking={isSpeaking}
            />
          </div>
        ))}

        {/* In-flight turn: the sent text, then translating dots or an error. */}
        {pending && (
          <div>
            <SourceBubble text={pending.text} lang={pending.sourceLang} inputMode={pending.inputMode} />
            {isTranslating ? (
              <TranslatingBubble />
            ) : error ? (
              <ErrorBubble message={errorMessage} retryable={error.retryable} onRetry={onRetry} />
            ) : null}
          </div>
        )}

        {/* Live dictation forming before it is sent. */}
        {isListening && liveText && (
          <SourceBubble text={liveText} lang={sourceLang} inputMode="voice" faded />
        )}
      </div>

      <div ref={endRef} aria-hidden="true" />
    </div>
  )
}
