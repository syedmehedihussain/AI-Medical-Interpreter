import { useCallback, useEffect, useRef, useState } from 'react'
import { getHealth } from './api/client'
import CapturePanel from './components/CapturePanel'
import Header from './components/Header'
import LanguageBar from './components/LanguageBar'
import ManualInput from './components/ManualInput'
import OutputPanel from './components/OutputPanel'
import Transcript from './components/Transcript'
import { useSpeak } from './hooks/useSpeak'
import { SPEECH_ERROR, useSpeech } from './hooks/useSpeech'
import { useTranslate } from './hooks/useTranslate'
import { DEFAULT_SOURCE, DEFAULT_TARGET, getLanguage, getOther } from './lib/languages'

const PAIR_KEY = 'ami.languagePair'
const AUTOPLAY_KEY = 'ami.autoplay'

// prd.md E-11: cap a finalised segment before sending. The backend rejects
// anything longer, so trimming here turns a hard error into a soft note.
const MAX_SEGMENT_LENGTH = 500

// How long speech must stay quiet before buffered segments are translated.
// Long enough to absorb a mid-sentence pause, short enough to still feel
// immediate. See the segment buffer below and decisions.md D-015.
const SEGMENT_FLUSH_MS = 1000

/**
 * Read the saved pair, defending against anything unusable in localStorage.
 *
 * Storage is user-writable and outlives code changes, so a value written by an
 * older build, or edited by hand, must not be able to crash the app on load.
 */
function loadLanguagePair() {
  const fallback = { sourceLang: DEFAULT_SOURCE, targetLang: DEFAULT_TARGET }
  try {
    const raw = localStorage.getItem(PAIR_KEY)
    if (!raw) return fallback
    const saved = JSON.parse(raw)
    if (!saved?.sourceLang || !getLanguage(saved.sourceLang)) return fallback
    // Re-derived rather than trusted: a same-language pair is unreachable
    // through the UI but trivially writable by hand.
    return { sourceLang: saved.sourceLang, targetLang: getOther(saved.sourceLang) }
  } catch {
    return fallback
  }
}

function loadAutoplay() {
  try {
    // prd.md F-4: on by default, since the clinical case is hands-free.
    return localStorage.getItem(AUTOPLAY_KEY) !== 'false'
  } catch {
    return true
  }
}

export default function App() {
  const [{ sourceLang, targetLang }, setLanguagePair] = useState(loadLanguagePair)
  const [backendReachable, setBackendReachable] = useState(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [autoplay, setAutoplay] = useState(loadAutoplay)
  const [entries, setEntries] = useState([])
  const [lastFinalText, setLastFinalText] = useState('')
  const [truncated, setTruncated] = useState(false)

  const { translate, isLoading, error, result } = useTranslate()
  const speak = useSpeak({ lang: targetLang })

  const lastRequestRef = useRef(null)
  const entryCounterRef = useRef(0)

  // prd.md F-7: checked once on load, then driven by request outcomes.
  useEffect(() => {
    let cancelled = false
    getHealth()
      .then(() => !cancelled && setBackendReachable(true))
      .catch(() => !cancelled && setBackendReachable(false))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(PAIR_KEY, JSON.stringify({ sourceLang, targetLang }))
    } catch {
      // Private browsing can make setItem throw. Not worth crashing over.
    }
  }, [sourceLang, targetLang])

  useEffect(() => {
    try {
      localStorage.setItem(AUTOPLAY_KEY, String(autoplay))
    } catch {
      // As above.
    }
  }, [autoplay])

  /**
   * The single translation entry point, shared by voice and typing.
   *
   * prd.md F-5 is explicit that manual entry is not a separate code path. The
   * only difference is inputMode, recorded on the transcript entry.
   */
  const runTranslation = useCallback(
    async (rawText, { inputMode = 'typed' } = {}) => {
      const text = rawText.slice(0, MAX_SEGMENT_LENGTH)
      setTruncated(rawText.length > MAX_SEGMENT_LENGTH)

      lastRequestRef.current = { text, inputMode }
      const data = await translate({ text, sourceLang, targetLang })
      if (!data) return null

      setBackendReachable(true)

      // Field names match schema.md section 3 so these serialise straight into
      // transcript rows when persistence arrives in v0.2.
      entryCounterRef.current += 1
      setEntries((previous) => [
        ...previous,
        {
          id: `${Date.now()}-${entryCounterRef.current}`,
          sourceText: data.source_text,
          translatedText: data.translated_text,
          sourceLang: data.source_lang,
          targetLang: data.target_lang,
          timestamp: new Date().toISOString(),
          inputMode,
          confidence: data.confidence,
          riskFlags: data.risk_flags ?? [],
        },
      ])

      if (autoplay) speak.speak(data.translated_text)
      return data
    },
    [translate, sourceLang, targetLang, autoplay, speak],
  )

  /**
   * Finalised speech segments are buffered, not translated one by one.
   *
   * Chrome finalises a segment on every brief pause, so "I have chest pain
   * ... since yesterday" arrives as two separate final results and, without
   * buffering, becomes two half-sentence translations. That reads to the user
   * as the app cutting them off mid-thought, and it translates worse, because
   * a fragment has less context than a sentence.
   *
   * So segments accumulate and are sent once speech has been quiet for
   * SEGMENT_FLUSH_MS. prd.md F-2 says a finalised phrase is sent immediately;
   * this is a deliberate departure, recorded as D-015. The cost is under a
   * second of added latency against a 5s budget (NFR-1.1); the benefit is
   * whole sentences.
   */
  const segmentBufferRef = useRef([])
  const flushTimerRef = useRef(null)
  const flushRef = useRef(() => {})

  const flushSegments = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    const buffered = segmentBufferRef.current.join(' ').trim()
    segmentBufferRef.current = []
    if (buffered) runTranslation(buffered, { inputMode: 'voice' })
  }, [runTranslation])

  // The pending timer captured whichever flush existed when it was scheduled.
  // If the language pair changed in between, that closure is stale, so the
  // timer calls through this ref instead of the captured function.
  useEffect(() => {
    flushRef.current = flushSegments
  }, [flushSegments])

  const handleFinalResult = useCallback((text) => {
    segmentBufferRef.current.push(text)
    const combined = segmentBufferRef.current.join(' ')
    setLastFinalText(combined)

    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)

    // Do not wait for quiet if the buffer is already at the length the
    // backend would reject (E-11); send what we have.
    if (combined.length >= MAX_SEGMENT_LENGTH) {
      flushRef.current()
      return
    }
    flushTimerRef.current = setTimeout(() => flushRef.current(), SEGMENT_FLUSH_MS)
  }, [])

  const speechLang = getLanguage(sourceLang)?.speechLang ?? 'en-US'
  const speech = useSpeech({ lang: speechLang, onFinalResult: handleFinalResult })

  /** Stopping should translate what was already said, not discard it. */
  const stopListening = useCallback(() => {
    speech.stop()
    flushRef.current()
  }, [speech])

  useEffect(() => () => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
  }, [])

  // prd.md E-1 and E-2: when voice cannot work, the typing path is the whole
  // app, so it opens by default rather than staying behind a disclosure.
  useEffect(() => {
    if (!speech.isSupported) setManualOpen(true)
  }, [speech.isSupported])

  useEffect(() => {
    if (
      speech.error?.code === SPEECH_ERROR.PERMISSION_DENIED ||
      speech.error?.code === SPEECH_ERROR.NO_MICROPHONE
    ) {
      setManualOpen(true)
    }
  }, [speech.error])

  // A network failure means Offline; a 400 or 500 does not, because the server
  // plainly answered.
  useEffect(() => {
    if (error?.code === 'NETWORK_ERROR') setBackendReachable(false)
  }, [error])

  const retry = useCallback(() => {
    const last = lastRequestRef.current
    if (last) runTranslation(last.text, { inputMode: last.inputMode })
  }, [runTranslation])

  const handleLanguageChange = useCallback((pair) => {
    setLanguagePair(pair)
    // The old caption belongs to the old language; leaving it on screen while
    // the label says otherwise is worse than clearing it.
    setLastFinalText('')
  }, [])

  // Listening outranks a live request, which outranks idle. Offline outranks
  // everything, since nothing can complete without the backend.
  let status = 'ready'
  if (backendReachable === false) status = 'offline'
  else if (speech.isListening) status = 'listening'
  else if (isLoading) status = 'translating'

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col bg-white shadow-sm">
      <Header status={status} />

      <LanguageBar
        sourceLang={sourceLang}
        targetLang={targetLang}
        onChange={handleLanguageChange}
      />

      <CapturePanel
        isListening={speech.isListening}
        interimText={speech.interimText}
        lastFinalText={lastFinalText}
        error={speech.error}
        isSupported={speech.isSupported}
        truncated={truncated}
        sourceLang={sourceLang}
        onStart={speech.start}
        onStop={stopListening}
      />

      <ManualInput
        open={manualOpen}
        onOpenChange={setManualOpen}
        onSubmit={(text) => {
          setLastFinalText(text)
          runTranslation(text, { inputMode: 'typed' })
        }}
        isLoading={isLoading}
        sourceLang={sourceLang}
      />

      <OutputPanel
        result={result}
        isLoading={isLoading}
        error={error}
        targetLang={targetLang}
        onRetry={retry}
        onSpeak={speak.speak}
        isSpeaking={speak.isSpeaking}
        hasVoice={speak.hasVoice}
        autoplay={autoplay}
        onAutoplayChange={setAutoplay}
      />

      <Transcript entries={entries} onClear={() => setEntries([])} />
    </div>
  )
}
