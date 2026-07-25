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

const PAIR_KEY = 'torongo.languagePair'
const AUTOPLAY_KEY = 'torongo.autoplay'

// prd.md E-11: cap a finalised segment before sending. The backend rejects
// anything longer, so trimming here turns a hard error into a soft note.
const MAX_SEGMENT_LENGTH = 500

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
   * A finalised speech segment translates with no further interaction.
   *
   * Kept in a ref-free useCallback whose identity changes with the language
   * pair, which is fine: useSpeech stores the latest callback in a ref, so a
   * new identity does not restart the engine.
   */
  const handleFinalResult = useCallback(
    (text) => {
      setLastFinalText(text)
      runTranslation(text, { inputMode: 'voice' })
    },
    [runTranslation],
  )

  const speechLang = getLanguage(sourceLang)?.speechLang ?? 'en-US'
  const speech = useSpeech({ lang: speechLang, onFinalResult: handleFinalResult })

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
        onStop={speech.stop}
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
