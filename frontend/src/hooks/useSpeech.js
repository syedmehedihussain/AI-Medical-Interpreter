import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Seam 4: speech recognition (stack.md section 4, decisions.md D-005, D-009).
 *
 * This is the ONLY file in the frontend that may reference SpeechRecognition
 * or webkitSpeechRecognition. In v0.4 it gets reimplemented over a WebSocket
 * to a Whisper endpoint; interim results become partial server messages and
 * final results become completed segments. The returned shape stays identical,
 * so nothing above this hook changes.
 *
 * Consequently, browser error strings must never escape. They are translated
 * into this app's own vocabulary here.
 */

/** Our error vocabulary. Callers switch on these, never on browser strings. */
export const SPEECH_ERROR = {
  UNSUPPORTED: 'UNSUPPORTED',
  INSECURE_CONTEXT: 'INSECURE_CONTEXT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NO_MICROPHONE: 'NO_MICROPHONE',
  NETWORK: 'NETWORK',
  PAUSED: 'PAUSED',
  UNKNOWN: 'UNKNOWN',
}

// prd.md E-8: after this many consecutive restarts that produced no speech,
// stop and tell the user, rather than looping forever against a dead mic.
const MAX_SILENT_RESTARTS = 5

// Breathing room before restarting. Restarting synchronously inside onend can
// spin into a tight loop when the microphone is unavailable.
const RESTART_DELAY_MS = 250

function getRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

/**
 * Translate a browser error code into ours.
 *
 * Chrome reports 'audio-capture' both when no microphone exists (E-5) and when
 * another application holds it (E-6). They are not distinguishable from here,
 * so they share one code and the copy mentions both causes.
 */
function mapBrowserError(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return SPEECH_ERROR.PERMISSION_DENIED
    case 'audio-capture':
      return SPEECH_ERROR.NO_MICROPHONE
    case 'network':
      return SPEECH_ERROR.NETWORK
    default:
      return SPEECH_ERROR.UNKNOWN
  }
}

export function useSpeech({ lang, onFinalResult }) {
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState(null)

  const recognitionRef = useRef(null)
  const restartTimerRef = useRef(null)
  // Whether the *user* wants to be listening. Distinct from isListening, which
  // tracks what the engine is actually doing; the engine stops on its own all
  // the time and we restart it silently.
  const wantsListeningRef = useRef(false)
  const silentRestartsRef = useRef(0)
  const heardSpeechRef = useRef(false)

  // Event handlers are attached once per recognition instance and would
  // otherwise close over the first render's props forever. Refs keep them
  // reading current values without re-creating the engine on every render.
  const onFinalResultRef = useRef(onFinalResult)
  const langRef = useRef(lang)
  useEffect(() => {
    onFinalResultRef.current = onFinalResult
  }, [onFinalResult])
  useEffect(() => {
    langRef.current = lang
  }, [lang])

  const support = useMemo(() => {
    if (!getRecognitionConstructor()) {
      return { isSupported: false, reason: SPEECH_ERROR.UNSUPPORTED }
    }
    // prd.md E-4: speech APIs require a secure context. localhost counts as
    // secure, so development over http is fine; a LAN IP is not.
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      return { isSupported: false, reason: SPEECH_ERROR.INSECURE_CONTEXT }
    }
    return { isSupported: true, reason: null }
  }, [])

  /** Tear down the current engine without triggering the restart path. */
  const teardown = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    const recognition = recognitionRef.current
    if (recognition) {
      // Detach first: otherwise abort() fires onend, which would restart it.
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.onstart = null
      try {
        recognition.abort()
      } catch {
        // Already dead. Nothing to do.
      }
      recognitionRef.current = null
    }
  }, [])

  /**
   * Build and start a fresh recognition instance.
   *
   * A new instance each time rather than reusing one: browsers differ on
   * whether restarting a finished instance is legal, and a fresh object is
   * cheap and reliable.
   */
  const spinUp = useCallback(() => {
    const Recognition = getRecognitionConstructor()
    if (!Recognition) return

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = langRef.current
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event) => {
      let interim = ''
      // resultIndex, not 0: results accumulate across the session, and
      // re-reading from the start would re-fire every finalised segment.
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          heardSpeechRef.current = true
          silentRestartsRef.current = 0
          const finalText = transcript.trim()
          if (finalText) onFinalResultRef.current?.(finalText)
        } else {
          interim += transcript
        }
      }
      // Clears on finalisation, since interim is '' once nothing is pending.
      setInterimText(interim)
    }

    recognition.onerror = (event) => {
      const browserCode = event?.error

      // prd.md E-7: silence is normal in a consultation. Never surface it;
      // onend follows and restarts.
      if (browserCode === 'no-speech') return
      // We aborted deliberately.
      if (browserCode === 'aborted') return

      const code = mapBrowserError(browserCode)
      setError({ code })

      // Permission and hardware failures are terminal: retrying in a loop
      // just re-triggers the same denial.
      if (code === SPEECH_ERROR.PERMISSION_DENIED || code === SPEECH_ERROR.NO_MICROPHONE) {
        wantsListeningRef.current = false
        setIsListening(false)
        setInterimText('')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimText('')

      if (!wantsListeningRef.current) return

      // prd.md E-8: the engine stops itself after a pause. Restart, but count
      // restarts that produced nothing so a dead microphone cannot loop.
      if (heardSpeechRef.current) silentRestartsRef.current = 0
      else silentRestartsRef.current += 1
      heardSpeechRef.current = false

      if (silentRestartsRef.current >= MAX_SILENT_RESTARTS) {
        wantsListeningRef.current = false
        silentRestartsRef.current = 0
        setError({ code: SPEECH_ERROR.PAUSED })
        return
      }

      restartTimerRef.current = setTimeout(() => {
        if (wantsListeningRef.current) spinUp()
      }, RESTART_DELAY_MS)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      // InvalidStateError when an engine is somehow already running. Drop this
      // instance rather than leaving two live.
      teardown()
      setIsListening(false)
    }
  }, [teardown])

  const start = useCallback(() => {
    if (!support.isSupported) {
      setError({ code: support.reason })
      return
    }
    if (wantsListeningRef.current) return
    wantsListeningRef.current = true
    silentRestartsRef.current = 0
    heardSpeechRef.current = false
    setError(null)
    teardown()
    spinUp()
  }, [support, teardown, spinUp])

  const stop = useCallback(() => {
    wantsListeningRef.current = false
    silentRestartsRef.current = 0
    teardown()
    setIsListening(false)
    setInterimText('')
  }, [teardown])

  // Recognition language is fixed when the engine starts, so a mid-session
  // language change (the swap button, used constantly) needs a restart to
  // take effect. Without this, swapping to Bangla would keep recognising
  // English until the user stopped and started again.
  useEffect(() => {
    if (!wantsListeningRef.current) return
    teardown()
    spinUp()
  }, [lang, teardown, spinUp])

  // Leaving the page with a live microphone would keep the tab's recording
  // indicator on. Always tear down.
  useEffect(() => teardown, [teardown])

  return {
    isListening,
    interimText,
    error,
    isSupported: support.isSupported,
    unsupportedReason: support.reason,
    start,
    stop,
    clearError: useCallback(() => setError(null), []),
  }
}
