import { useCallback, useEffect, useRef, useState } from 'react'
import { getHealth, summarize } from './api/client'
import Home from './components/Home'
import Studio from './components/Studio'
import { useSpeak } from './hooks/useSpeak'
import { useSpeech } from './hooks/useSpeech'
import { useTranslate } from './hooks/useTranslate'
import { chunkBySentence } from './lib/chunk'
import { DEFAULT_SOURCE, DEFAULT_TARGET, getLanguage, getOther } from './lib/languages'

const PAIR_KEY = 'ami.languagePair'
const AUTOPLAY_KEY = 'ami.autoplay'

// prd.md E-11: the backend rejects text longer than this. A recorded passage is
// split into pieces of at most this many characters on sentence boundaries
// before sending (chunkBySentence), so a long monologue is never truncated.
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

  const { translateChunks, isLoading, error } = useTranslate()
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
      const text = rawText.trim()
      if (!text) return null

      lastRequestRef.current = { text, inputMode }
      // Show the sent turn immediately, before the network answers.
      setPendingSource({ text, inputMode, sourceLang, targetLang })
      // A recorded passage may be longer than the backend's limit; split it on
      // sentence boundaries and translate the pieces as one exchange. Typed
      // input is already capped at MAX_SEGMENT_LENGTH, so it stays one chunk.
      const chunks = chunkBySentence(text, MAX_SEGMENT_LENGTH)
      const data = await translateChunks(chunks, { sourceLang, targetLang })
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
    [translateChunks, sourceLang, targetLang, autoplay, speak],
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
   * Record-until-Done: finalised speech segments accumulate for the whole
   * utterance and are translated only when the user clicks Done.
   *
   * Chrome finalises a segment on every brief pause, so a spoken sentence
   * arrives as several `onFinalResult` calls. Rather than translate each
   * fragment (worse context) or auto-send after a silence (the old D-015
   * behaviour, which cut people off mid-thought), every segment is appended to
   * the buffer and shown live. The complete passage is sent once, on Done, and
   * chunkBySentence keeps each request within the backend's limit.
   */
  const segmentBufferRef = useRef([])
  const runTranslationRef = useRef(runTranslation)
  useEffect(() => {
    // finishRecording is called from an event handler that may have closed over
    // an older runTranslation (e.g. after a language swap); go through the ref
    // so it always sees the current one.
    runTranslationRef.current = runTranslation
  }, [runTranslation])

  const handleFinalResult = useCallback((text) => {
    segmentBufferRef.current.push(text)
    // Show the transcript building up as the user speaks.
    setLastFinalText(segmentBufferRef.current.join(' '))
  }, [])

  const speechLang = getLanguage(sourceLang)?.speechLang ?? 'en-US'
  const speech = useSpeech({ lang: speechLang, onFinalResult: handleFinalResult })

  /** Done: stop the mic and translate everything captured so far, as one turn. */
  const finishRecording = useCallback(() => {
    speech.stop()
    const transcript = segmentBufferRef.current.join(' ').trim()
    segmentBufferRef.current = []
    // Clear the live dictation; the sent turn now lives in pendingSource.
    setLastFinalText('')
    if (transcript) runTranslationRef.current(transcript, { inputMode: 'voice' })
  }, [speech])

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
      onStop={finishRecording}
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
