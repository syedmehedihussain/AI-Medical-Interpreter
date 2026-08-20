import { useCallback, useEffect, useRef, useState } from 'react'
import { getHealth, summarize } from './api/client'
import Home from './components/Home'
import Studio from './components/Studio'
import { useSpeak } from './hooks/useSpeak'
import { useSpeech } from './hooks/useSpeech'
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
  // Two views, no router: the marketing home and the interpreter tool.
  const [view, setView] = useState('home')
  const [{ sourceLang, targetLang }, setLanguagePair] = useState(loadLanguagePair)
  const [backendReachable, setBackendReachable] = useState(null)
  const [autoplay] = useState(loadAutoplay)
  const [entries, setEntries] = useState([])
  const [lastFinalText, setLastFinalText] = useState('')
  // The utterance being translated. Cleared on success; kept on error for retry.
  const [pendingSource, setPendingSource] = useState(null)
  // Seconds the mic has been open, for the console's recording timer.
  const [listenSeconds, setListenSeconds] = useState(0)
  // The AI conversation summary: generated on demand, cached until regenerated.
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState(null)

  const { translate, isLoading, error } = useTranslate()
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

      lastRequestRef.current = { text, inputMode }
      // Show the sent turn immediately, before the network answers.
      setPendingSource({ text, inputMode, sourceLang, targetLang })
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
          needsReview: Boolean(data.needs_review),
        },
      ])
      // The turn is now committed to the transcript; drop the in-flight copy.
      setPendingSource(null)

      if (autoplay) speak.speak(data.translated_text)
      return data
    },
    [translate, sourceLang, targetLang, autoplay, speak],
  )

  /**
   * Generate the AI summary from the current transcript.
   *
   * Each entry becomes one English turn: the doctor's own English utterance, or
   * the English translation of the patient's Bangla, so the note reads in one
   * language. The result is cached in state; callers (the summary tab, the
   * Regenerate button) invoke this and read `summary`/`summaryLoading`.
   */
  const generateSummary = useCallback(async () => {
    if (summaryLoading || entries.length === 0) return
    const turns = entries.map((entry) => {
      const doctorSide = entry.sourceLang === 'en'
      return {
        speaker: doctorSide ? 'doctor' : 'patient',
        text: doctorSide ? entry.sourceText : entry.translatedText,
      }
    })
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const data = await summarize({ turns })
      setSummary(data.summary)
    } catch (err) {
      setSummaryError(err)
    } finally {
      setSummaryLoading(false)
    }
  }, [entries, summaryLoading])

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
    // Clear the live dictation; the sent turn now lives in pendingSource.
    setLastFinalText('')
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

  // Drive the recording timer from the listening state: reset when the mic
  // opens, tick once a second while it stays open.
  useEffect(() => {
    if (!speech.isListening) return undefined
    setListenSeconds(0)
    const id = setInterval(() => setListenSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [speech.isListening])

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

  const offline = backendReachable === false

  if (view === 'home') {
    return <Home onStart={() => setView('tool')} />
  }

  const liveText = [lastFinalText, speech.interimText].filter(Boolean).join(' ')

  return (
    <Studio
      sourceLang={sourceLang}
      targetLang={targetLang}
      onLanguageChange={handleLanguageChange}
      onBack={() => setView('home')}
      offline={offline}
      isListening={speech.isListening}
      isSupported={speech.isSupported}
      liveText={liveText}
      listenSeconds={listenSeconds}
      entries={entries}
      pending={pendingSource}
      isTranslating={isLoading}
      error={error}
      onRetry={retry}
      onStart={speech.start}
      onStop={stopListening}
      onSubmit={(text) => runTranslation(text, { inputMode: 'typed' })}
      onSpeak={speak.speak}
      hasVoice={speak.hasVoice}
      isSpeaking={speak.isSpeaking}
      summary={summary}
      summaryLoading={summaryLoading}
      summaryError={summaryError}
      onGenerateSummary={generateSummary}
    />
  )
}
