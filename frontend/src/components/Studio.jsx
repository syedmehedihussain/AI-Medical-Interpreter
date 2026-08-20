import { useEffect, useMemo, useRef, useState } from 'react'
import { getDisplayLabel, getOther, isBengali } from '../lib/languages'
import { messageForError } from '../lib/messages'
import { DOMAINS, detectDomain } from '../lib/domains'

// The interpreter console: history + model on the left, live translation in the
// centre, domain detection on the right. Presentation only; App owns the wiring.

function Shield({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EcgLine() {
  return (
    <div className="relative h-10 w-full overflow-hidden" aria-hidden="true">
      <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="h-full w-full">
        <path
          d="M0 30 H360 l20 -18 l22 40 l26 -52 l20 30 H520 l16 -10 l14 20 l18 -28 l14 18 H1200"
          fill="none" stroke="#136b5b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="1200" className="animate-ecg"
        />
      </svg>
      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 animate-pulse-dot rounded-full bg-clay-500 ring-4 ring-clay-500/20" />
    </div>
  )
}

const DOMAIN_ICONS = {
  cardiology: 'M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 15.5 12 20 12 20z',
  neurology: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 4 3 3 0 0 0 5 1V4.5A2.5 2.5 0 0 0 9 4zm6 0a2.5 2.5 0 0 0-2 .5V17a3 3 0 0 0 5-1 3 3 0 0 0 2-4 3 3 0 0 0-1-5 3 3 0 0 0-4-3z',
  pulmonology: 'M12 4v8m0 0c-1 3-4 3-5 6-.5 2 .5 3 2 3s2-2 2-4m1-5c1 3 4 3 5 6 .5 2-.5 3-2 3s-2-2-2-4',
  general: 'M6 4v5a4 4 0 0 0 8 0V4m-4 12a4 4 0 0 0 4 4 3 3 0 0 0 3-3v-3',
  orthopedics: 'M8 8a2 2 0 1 1-2-2 2 2 0 0 1-1-1m3 3 8 8m0 0a2 2 0 1 0 2 2 2 2 0 0 0 1 1',
  ophthalmology: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
}

const SAMPLE_HISTORY = [
  { title: 'Fever & chest pain', when: '09:14', pair: 'Sylheti → EN' },
  { title: 'Prescription refill', when: 'Yesterday', pair: 'Bangla → EN' },
  { title: 'Antenatal check-up', when: 'Aug 18', pair: 'Chatgaiya → EN' },
]

const GUIDELINES = [
  'Prioritises clinical accuracy over fluency.',
  'Flags idioms it cannot verify.',
  'Never infers a diagnosis, only translates.',
  'Confirms medical domain before routing.',
]

function Sidebar({ onBack }) {
  return (
    <aside className="flex flex-col gap-5">
      <section>
        <h2 className="mb-2 px-1 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">History</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-2">
          {SAMPLE_HISTORY.map((item, i) => (
            <button
              key={item.title}
              type="button"
              className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 ${i > 0 ? 'border-t border-slate-100' : ''}`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i === 0 ? 'bg-pine-600' : 'bg-slate-300'}`} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">{item.title}</span>
                  <span className="shrink-0 text-xs text-slate-400">{item.when}</span>
                </span>
                <span className="mt-0.5 block font-mono text-xs text-slate-400">{item.pair}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 px-1 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">Model</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-50 text-pine-600">
                <Shield className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Gemini 3.7 Flash</p>
                <p className="font-mono text-xs text-slate-400">Provider · Google</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-full border border-pine-200 py-2 text-sm font-semibold text-pine-700 transition hover:bg-pine-50"
            title="Provider seam: stub / mymemory / google_free / google / gemini"
          >
            Switch provider
          </button>
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800">Model details &amp; guideline</h3>
        <ul className="mt-3 space-y-2">
          {GUIDELINES.map((g) => (
            <li key={g} className="flex gap-2 text-[13px] leading-relaxed text-slate-600">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-pine-400" />
              {g}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-slate-100 pt-3 font-mono text-[11px] text-slate-400">
          Model card last reviewed 12 Aug 2026
        </p>
      </div>

      <div className="rounded-2xl bg-pine-50 p-4">
        <div className="flex gap-3 text-pine-800">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-pine-600" />
          <div>
            <p className="text-sm font-semibold">Session audio is not stored.</p>
            <p className="mt-0.5 text-[13px] text-pine-700/80">Transcripts stay on this device.</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Leave session
      </button>
    </aside>
  )
}

function DomainPanel({ detected, confidence }) {
  const [confirmed, setConfirmed] = useState(null)

  return (
    <aside className="flex flex-col gap-4">
      <div>
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">Domain</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
          A likely specialty, surfaced from the conversation. You confirm before anything routes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {DOMAINS.map((domain) => {
          const isDetected = detected === domain.id
          const isConfirmed = confirmed === domain.id
          return (
            <div
              key={domain.id}
              className={`rounded-2xl border p-4 transition ${
                isDetected
                  ? 'border-clay-400 bg-clay-50 shadow-sm'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  isDetected ? 'bg-clay-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d={DOMAIN_ICONS[domain.id]} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-800">{domain.name}</p>
              {isDetected ? (
                isConfirmed ? (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-pine-600">
                    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    confirmed
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmed(domain.id)}
                    className="mt-2 rounded-md bg-clay-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-clay-600"
                  >
                    Confirm
                  </button>
                )
              ) : (
                <p className="mt-1 text-xs text-slate-400">not detected</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-dashed border-pine-300 bg-pine-50/40 p-4 font-mono text-[12px] leading-relaxed text-pine-800">
        <p className="text-pine-600">// system note</p>
        <p className="mt-2 text-pine-800/90">
          Mita reads the conversation, guesses the medical domain, and waits for you to confirm before it routes care.
        </p>
        <p className="mt-3 font-semibold text-pine-700">
          Confidence · {detected ? `${confidence}%` : '—'}
        </p>
      </div>
    </aside>
  )
}

function Waveform() {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[0, 120, 240, 360, 180, 60, 300].map((delay, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full bg-clay-500 animate-pulse"
          style={{ height: `${8 + (i % 4) * 5}px`, animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}

function LanguageToggle({ sourceLang, targetLang, onChange }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
      <button
        type="button"
        onClick={() => onChange({ sourceLang: 'en', targetLang: getOther('en') })}
        aria-pressed={sourceLang === 'en'}
        className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${
          sourceLang === 'en' ? 'bg-pine-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => onChange({ sourceLang: targetLang, targetLang: sourceLang })}
        aria-label="Swap direction"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-pine-700"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M4 7h12m0 0-3-3m3 3-3 3M16 13H4m0 0 3 3m-3-3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange({ sourceLang: 'bn', targetLang: getOther('bn') })}
        aria-pressed={sourceLang === 'bn'}
        className={`flex-1 rounded-full py-2.5 font-bn text-sm font-semibold transition ${
          sourceLang === 'bn' ? 'bg-pine-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        বাংলা
      </button>
    </div>
  )
}

function HistoryList({ entries }) {
  if (entries.length === 0) {
    return (
      <p className="px-1 py-6 text-sm leading-relaxed text-slate-400">
        Nothing yet. Speak or type above and the exchange appears here. History clears when you refresh.
      </p>
    )
  }
  return (
    <div className="space-y-5">
      {entries.map((entry) => {
        const doctorSide = entry.sourceLang === 'en'
        return (
          <div key={entry.id} className="space-y-1.5">
            <div className={doctorSide ? 'text-left' : 'text-right'}>
              <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {doctorSide ? 'Doctor' : 'Patient'}
              </p>
              <p className={`${isBengali(entry.sourceLang) ? 'font-bn text-bn' : 'text-[15px]'} text-slate-700`}>
                {entry.sourceText}
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-pine-600">
                Mita · {getDisplayLabel(entry.targetLang)}
              </p>
              <p className={`${isBengali(entry.targetLang) ? 'font-bn text-bn' : 'text-[15px]'} text-slate-800`}>
                {entry.translatedText}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function useSessionClock() {
  const start = useRef(Date.now())
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export default function Studio({
  sourceLang,
  targetLang,
  onLanguageChange,
  onBack,
  offline,
  isListening,
  isSupported,
  liveText,
  listenSeconds,
  entries,
  pending,
  isTranslating,
  error,
  onRetry,
  onStart,
  onStop,
  onSubmit,
  onSpeak,
  hasVoice,
  isSpeaking,
}) {
  const [draft, setDraft] = useState('')
  const [tab, setTab] = useState('history')
  const clock = useSessionClock()

  const latest = entries.length ? entries[entries.length - 1] : null
  const shownMessage = isListening ? liveText : pending?.text ?? (draft || latest?.sourceText || '')
  const translationText = pending && isTranslating ? null : latest?.translatedText
  const verified = latest && !latest.needsReview

  const lastSource = pending?.text ?? latest?.sourceText ?? ''
  const domainHint = useMemo(() => detectDomain(lastSource), [lastSource])

  const submit = () => {
    const text = draft.trim()
    if (!text) return
    onSubmit(text)
    setDraft('')
  }

  return (
    <div className="min-h-[100dvh] bg-console">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <button type="button" onClick={onBack} className="flex items-center gap-3 text-left" title="Back to home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine-600 text-white">
              <Shield />
            </span>
            <span>
              <span className="flex items-center gap-2">
                <span className="font-serif text-xl font-semibold text-slate-900">Mita</span>
                <span className="rounded-full bg-clay-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">AI</span>
              </span>
              <span className="block text-xs text-slate-500">Real-time medical interpreter</span>
            </span>
          </button>

          <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2 ${offline ? 'border-slate-200 bg-slate-50' : 'border-pine-200 bg-pine-50/60'}`}>
            <span className={`h-2 w-2 rounded-full ${offline ? 'border-2 border-slate-400 bg-transparent' : 'animate-pulse-dot bg-clay-500'}`} />
            <span className="text-sm">
              <span className="font-semibold text-slate-800">{offline ? 'Offline' : 'Live session'}</span>
              <span className="ml-2 font-mono text-xs text-slate-500">
                {getDisplayLabel(sourceLang)} → {getDisplayLabel(targetLang)}
              </span>
            </span>
          </div>
        </header>

        <div className="border-t border-slate-200" />

        <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-[264px_minmax(0,1fr)_320px]">
          <Sidebar onBack={onBack} />

          <main className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <EcgLine />

            <div className="mt-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.15em]">
              <span className="text-slate-400">Session · {clock}</span>
              <span className="flex items-center gap-1.5 text-pine-600">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pine-500" />
                Translation live
              </span>
            </div>

            <h1 className="mt-4 font-serif text-4xl font-semibold text-slate-900 sm:text-5xl">
              Hello, I&rsquo;m Mita
            </h1>
            <p className="mt-2 text-lg text-slate-500">your medical interpreter, on call.</p>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500">
              Speak or type in English or Bangla, I&rsquo;ll render it in the other language right away.
            </p>

            <p className="mb-2 mt-6 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">
              Select your language
            </p>
            <LanguageToggle sourceLang={sourceLang} targetLang={targetLang} onChange={onLanguageChange} />

            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">Your message</span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase text-slate-500">
                  {sourceLang}
                </span>
              </div>

              {isListening ? (
                <p className={`min-h-[3rem] ${isBengali(sourceLang) ? 'font-bn text-bn' : 'text-lg'} text-slate-800`}>
                  {shownMessage || <span className="text-slate-400">Listening…</span>}
                </p>
              ) : (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 500))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      submit()
                    }
                  }}
                  rows={2}
                  placeholder={shownMessage && !draft ? shownMessage : `Type in ${getDisplayLabel(sourceLang)}…`}
                  aria-label={`Message in ${getDisplayLabel(sourceLang)}`}
                  className={`min-h-[3rem] w-full resize-none bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none ${
                    isBengali(sourceLang) ? 'font-bn text-bn' : 'text-lg'
                  }`}
                />
              )}

              <div className="mt-2 flex items-center gap-3">
                {isSupported && (
                  <button
                    type="button"
                    onClick={isListening ? onStop : onStart}
                    aria-pressed={isListening}
                    aria-label={isListening ? 'Stop recording' : 'Start recording'}
                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 ${
                      isListening ? 'bg-clay-500' : 'bg-pine-600 hover:bg-pine-700'
                    }`}
                  >
                    {isListening && <span className="absolute inset-0 animate-ping rounded-full bg-clay-500/40" />}
                    <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
                      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
                    </svg>
                  </button>
                )}

                {isListening ? (
                  <>
                    <Waveform />
                    <span className="ml-auto font-mono text-sm text-slate-400">
                      {`0:${String(listenSeconds).padStart(2, '0')}`}
                    </span>
                  </>
                ) : draft.trim() ? (
                  <button
                    type="button"
                    onClick={submit}
                    className="ml-auto flex items-center gap-1.5 rounded-full bg-pine-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine-700"
                  >
                    Translate
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 10h12m0 0-5-5m5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : (
                  <span className="ml-auto text-xs text-slate-400">Enter to translate</span>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-pine-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-pine-700/70">Translation</span>
                <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-semibold uppercase text-pine-700">
                  {getDisplayLabel(targetLang)}
                </span>
              </div>

              <div className="min-h-[3rem]">
                {isTranslating ? (
                  <span className="inline-flex items-center gap-2 text-pine-700">
                    <span className="text-sm font-medium">Translating</span>
                    <span className="flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-pine-500" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  </span>
                ) : error && pending ? (
                  <div className="flex items-center gap-3 text-sm text-clay-700">
                    <span>{messageForError(error)}</span>
                    {error.retryable && (
                      <button type="button" onClick={onRetry} className="rounded-full border border-clay-300 bg-white px-3 py-1 text-xs font-semibold text-clay-700 hover:bg-clay-50">
                        Retry
                      </button>
                    )}
                  </div>
                ) : translationText ? (
                  <p className={`${isBengali(targetLang) ? 'font-bn text-bn-lg' : 'text-xl leading-relaxed'} font-medium text-slate-900`}>
                    {translationText}
                  </p>
                ) : (
                  <p className="text-slate-400">The translation appears here.</p>
                )}
              </div>

              {translationText && !isTranslating && (
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onSpeak(translationText)}
                    disabled={!hasVoice}
                    className="flex items-center gap-1.5 text-xs font-medium text-pine-700 transition hover:text-pine-800 disabled:opacity-40"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                      <path d="M4 8v4h3l4 3V5L7 8H4z" strokeLinejoin="round" />
                      <path d={isSpeaking ? 'M14 6.5a5 5 0 0 1 0 7' : 'M14 7.5a3.5 3.5 0 0 1 0 5'} strokeLinecap="round" />
                    </svg>
                    Play aloud
                  </button>
                  <span className={`flex items-center gap-1 text-xs font-semibold ${verified ? 'text-pine-600' : 'text-clay-600'}`}>
                    {verified ? (
                      <>
                        verified
                        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    ) : (
                      'needs review'
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              {[
                ['summary', 'Conversation summary'],
                ['history', 'Conversation history'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab === id ? 'bg-pine-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              {tab === 'history' ? (
                <HistoryList entries={entries} />
              ) : (
                <p className="text-sm leading-relaxed text-slate-500">
                  {entries.length
                    ? `${entries.length} exchange${entries.length > 1 ? 's' : ''} this session, ${getDisplayLabel(sourceLang)} ↔ ${getDisplayLabel(targetLang)}${domainHint ? `, likely ${DOMAINS.find((d) => d.id === domainHint.id)?.name}` : ''}. Transcripts stay on this device.`
                    : 'A running summary appears once the conversation begins.'}
                </p>
              )}
            </div>
          </main>

          <DomainPanel detected={domainHint?.id ?? null} confidence={domainHint?.confidence ?? 0} />
        </div>
      </div>
    </div>
  )
}
