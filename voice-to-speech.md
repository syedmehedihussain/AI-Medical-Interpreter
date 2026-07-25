# voice-to-speech.md

**A reusable prompt for adding browser speech-to-text and text-to-speech to a React project.**

Paste [Part 1](#part-1--the-prompt) into Claude Code (or any coding agent) in the target project. Parts 2 and 3 exist so the agent, or you, can check the result against the traps that actually bite. Part 4 is a working reference implementation to copy directly if you would rather not have it regenerated.

> **Status of this document.** The implementation below is running in the Torongo project. Its support detection, error mapping, and render paths are verified; the live microphone path has not yet been confirmed on real hardware at the time of writing. Treat Part 3's checklist as work you still have to do, not as work already done.

---

## Part 1 — the prompt

```
Add browser-based speech-to-text and text-to-speech to this project.

Requirements:

1. Create a single hook, src/hooks/useSpeech.js, that is the ONLY file in the
   codebase permitted to reference SpeechRecognition or webkitSpeechRecognition.
   Everything else subscribes to its state. This matters because the engine
   gets swapped later (server-side Whisper over a WebSocket, a different vendor,
   a native wrapper) and nothing above the hook should have to change.

   Signature:  useSpeech({ lang, onFinalResult })
   Returns:    { isListening, interimText, error, isSupported, start, stop }

   - `lang` is a BCP-47 tag such as "en-US". The hook does not know about
     application-level language codes.
   - `onFinalResult(text)` fires once per finalised segment.
   - `error` is an object { code, detail } where `code` is from OUR vocabulary,
     never a raw browser string. Callers switch on `code` only.

2. Create src/hooks/useSpeak.js for synthesis.

   Signature:  useSpeak({ lang })
   Returns:    { speak, cancel, isSpeaking, hasVoice }

   - Voice selection walks an ordered fallback list of BCP-47 tags, trying an
     exact match first, then any voice sharing the primary subtag.
   - hasVoice is false when nothing matches, so the UI can disable the control
     with an explanation instead of appearing to do nothing.

3. Create a diagnostic page at public/mic-test.html that drives the browser
   speech API directly with none of the app's code involved, logging every
   recognition event, getUserMedia results, and the installed voice list.
   When speech misbehaves this is what tells you whether the bug is yours.

4. UI requirements:
   - Interim (provisional) and final (settled) text must be visually distinct,
     and that distinction must survive without colour AND without motion.
     Carry it with font weight and opacity.
   - The listening control is a single toggle, labelled for its state.
   - Wrap captions in an aria-live="polite" region.
   - Respect prefers-reduced-motion for any pulse or transition.

5. Handle every case in the table below. Do not collapse them into one
   generic error; each has a different action for the user.

   | Situation                        | Behaviour                                     |
   |----------------------------------|-----------------------------------------------|
   | API absent (Firefox)             | Hide the control entirely, name Chrome/Edge   |
   | Page not a secure context        | Explain HTTPS or localhost is required        |
   | Permission denied or dismissed   | Explain, return control to idle so it retries |
   | No microphone / mic held by app  | Explain both causes; they are indistinguishable|
   | Silence during a pause           | Restart SILENTLY. Never surface it            |
   | Engine stops on its own          | Restart automatically                         |
   | Repeated restarts, no speech     | After 5, stop and say "paused, tap to resume" |
   | Segment longer than the limit    | Truncate before sending, show a note          |

Read the "traps" list I am pasting below before writing any code; several
requirements above look redundant and are not.
```

Paste [Part 2](#part-2--the-traps) immediately after that block.

---

## Part 2 — the traps

Every one of these is a real defect that appears if the corresponding rule is skipped. They are listed because each looks like unnecessary complexity to anyone who has not hit it.

**1. `event.resultIndex`, not `0`.**
Results accumulate across a continuous session. Iterating from index 0 on every `onresult` re-fires every previously finalised segment, so each sentence gets submitted again and again, growing worse as the session goes on.

**2. Detach handlers before calling `abort()`.**
`abort()` fires `onend`. If `onend` contains the auto-restart logic, then stopping immediately restarts. The engine becomes impossible to turn off. Null out `onresult`, `onerror`, `onend` first.

**3. "The user wants to listen" is not "the engine is running".**
Keep them as separate values: a ref for intent, state for reality. Browsers stop recognition constantly on their own, and each stop must be restarted silently without the button flickering or the UI claiming it stopped.

**4. Event handlers capture stale props.**
Handlers are attached once per engine instance and close over that render's values forever. Without refs, the hook keeps recognising in whatever language was selected at mount. Mirror `lang` and `onFinalResult` into refs updated by an effect.

**5. Changing language requires restarting the engine.**
`recognition.lang` is read when recognition starts. Setting it mid-session does nothing. If your app has a language switcher, an effect on `lang` must tear down and respin, or the user switches language and it keeps hearing the old one.

**6. Create a fresh instance per restart.**
Browsers disagree about whether restarting a finished `SpeechRecognition` object is legal. A new object each time is cheap and predictable, and `start()` on a live instance throws `InvalidStateError` — wrap it in try/catch.

**7. Delay the restart, and count restarts.**
Restarting synchronously inside `onend` spins into a tight loop when the microphone is unavailable, pinning a CPU core. Use a ~250ms timeout, and stop after N consecutive restarts that produced no speech.

**8. `no-speech` is not an error.**
Browsers fire it after a few seconds of quiet. In any real conversation, silence is normal. Surfacing it produces an error message every time somebody pauses to think. Swallow it and let the restart path handle it.

**9. `getVoices()` is empty on first call.**
In Chrome the voice list populates asynchronously. Reading it once on mount returns `[]`, no voice ever matches, and synthesis silently does nothing. Subscribe to the `voiceschanged` event and re-read.

**10. `speechSynthesis.cancel()` before every `speak()`.**
Utterances queue by default. Without cancelling, a rapid sequence of results plays back-to-back, minutes behind the conversation.

**11. Cancel synthesis on unmount.**
`speechSynthesis` is a global. An utterance outlives the component that started it, so navigating away leaves the page talking.

**12. Missing voices are common and not a failure.**
Many languages have no installed voice on many systems, especially on Linux and older iOS. Disable the control with a tooltip explaining why; the text is still on screen and readable. This is a degraded state, not an error state.

**13. `audio-capture` is ambiguous.**
Chrome reports it both for "no microphone exists" and "another application holds the microphone". They cannot be told apart from the API, so write one message naming both causes.

**14. localhost counts as a secure context.**
Do not gate on `location.protocol === 'https:'` — that breaks local development. Check `window.isSecureContext`, which is true for `https://` and for `localhost`, and false for a LAN IP over plain HTTP. Testing on a phone via a LAN IP is exactly when this bites.

---

## Part 3 — what you must test manually

None of this can be verified without a browser, a microphone, and a person. An agent reporting "done" has not tested any of it.

- [ ] Speak three sentences with pauses; all three produce results without touching the screen
- [ ] Watch the caption change weight as words settle from provisional to final
- [ ] Stay silent 20 seconds, then speak; still listening, second sentence works
- [ ] Press stop mid-sentence; it actually stops and stays stopped
- [ ] Switch language mid-session and speak the new language
- [ ] Deny microphone permission, reload; readable message, fallback usable
- [ ] Disconnect the microphone while listening; stops within 5 restarts, no CPU spin
- [ ] Confirm a voice exists for each target language, or the control is disabled with a reason
- [ ] Trigger two results in quick succession; only the newest is spoken
- [ ] Navigate away mid-utterance; speech stops
- [ ] Load over a LAN IP on plain HTTP; the secure-context message appears
- [ ] Enable OS "reduce motion"; pulse animation stops

---

## Part 4 — reference implementation

Copy these directly if you would rather not regenerate them. Framework: React 18 or 19, no dependencies.

### `src/hooks/useSpeech.js`

```js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export const SPEECH_ERROR = {
  UNSUPPORTED: 'UNSUPPORTED',
  INSECURE_CONTEXT: 'INSECURE_CONTEXT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NO_MICROPHONE: 'NO_MICROPHONE',
  NETWORK: 'NETWORK',
  PAUSED: 'PAUSED',
  UNKNOWN: 'UNKNOWN',
}

const MAX_SILENT_RESTARTS = 5
const RESTART_DELAY_MS = 250

function getRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

// Trap 13: 'audio-capture' means both "no mic" and "mic busy".
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
  const wantsListeningRef = useRef(false)   // trap 3
  const silentRestartsRef = useRef(0)       // trap 7
  const heardSpeechRef = useRef(false)

  // Trap 4: handlers would otherwise capture the first render's props.
  const onFinalResultRef = useRef(onFinalResult)
  const langRef = useRef(lang)
  useEffect(() => { onFinalResultRef.current = onFinalResult }, [onFinalResult])
  useEffect(() => { langRef.current = lang }, [lang])

  const support = useMemo(() => {
    if (!getRecognitionConstructor()) {
      return { isSupported: false, reason: SPEECH_ERROR.UNSUPPORTED }
    }
    // Trap 14: isSecureContext, not a protocol check.
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      return { isSupported: false, reason: SPEECH_ERROR.INSECURE_CONTEXT }
    }
    return { isSupported: true, reason: null }
  }, [])

  const teardown = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    const recognition = recognitionRef.current
    if (recognition) {
      // Trap 2: detach BEFORE abort, or abort triggers the restart path.
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.onstart = null
      try { recognition.abort() } catch { /* already dead */ }
      recognitionRef.current = null
    }
  }, [])

  const spinUp = useCallback(() => {
    const Recognition = getRecognitionConstructor()
    if (!Recognition) return

    // Trap 6: a fresh instance every time.
    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = langRef.current
    recognition.maxAlternatives = 1

    recognition.onstart = () => { setIsListening(true); setError(null) }

    recognition.onresult = (event) => {
      let interim = ''
      // Trap 1: start at resultIndex, not 0.
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
      setInterimText(interim)
    }

    recognition.onerror = (event) => {
      const browserCode = event?.error
      if (browserCode === 'no-speech') return   // trap 8
      if (browserCode === 'aborted') return     // we did that

      const code = mapBrowserError(browserCode)
      setError({ code, detail: browserCode })

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

      if (heardSpeechRef.current) silentRestartsRef.current = 0
      else silentRestartsRef.current += 1
      heardSpeechRef.current = false

      if (silentRestartsRef.current >= MAX_SILENT_RESTARTS) {
        wantsListeningRef.current = false
        silentRestartsRef.current = 0
        setError({ code: SPEECH_ERROR.PAUSED })
        return
      }
      // Trap 7: delay, do not restart synchronously.
      restartTimerRef.current = setTimeout(() => {
        if (wantsListeningRef.current) spinUp()
      }, RESTART_DELAY_MS)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      teardown()
      setIsListening(false)
    }
  }, [teardown])

  const start = useCallback(() => {
    if (!support.isSupported) { setError({ code: support.reason }); return }
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

  // Trap 5: lang is read at start, so a change needs a restart.
  useEffect(() => {
    if (!wantsListeningRef.current) return
    teardown()
    spinUp()
  }, [lang, teardown, spinUp])

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
```

### `src/hooks/useSpeak.js`

```js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function normalise(tag) {
  return String(tag || '').toLowerCase().replace('_', '-')
}

// Exact match first, then any voice sharing the primary subtag, so a system
// with only bn-IN still serves a request for bn-BD.
function pickVoice(voices, ttsLangs) {
  if (!voices.length) return null
  for (const candidate of ttsLangs) {
    const wanted = normalise(candidate)
    const exact = voices.find((v) => normalise(v.lang) === wanted)
    if (exact) return exact
    const primary = wanted.split('-')[0]
    const loose = voices.find((v) => normalise(v.lang).split('-')[0] === primary)
    if (loose) return loose
  }
  return null
}

export function useSpeak({ lang, ttsLangs }) {
  const [voices, setVoices] = useState([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef(null)

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

  // Trap 9: getVoices() is empty on first call in Chrome.
  useEffect(() => {
    if (!synth) return undefined
    const load = () => setVoices(synth.getVoices() ?? [])
    load()
    synth.addEventListener?.('voiceschanged', load)
    return () => synth.removeEventListener?.('voiceschanged', load)
  }, [synth])

  const voice = useMemo(
    () => pickVoice(voices, ttsLangs ?? [lang]),
    [voices, ttsLangs, lang],
  )

  const cancel = useCallback(() => {
    if (!synth) return
    synth.cancel()
    setIsSpeaking(false)
  }, [synth])

  const speak = useCallback((text) => {
    if (!synth || !text?.trim()) return
    synth.cancel()  // trap 10: utterances queue otherwise

    const utterance = new SpeechSynthesisUtterance(text)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    } else {
      utterance.lang = (ttsLangs ?? [lang])[0]
    }
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    utteranceRef.current = utterance
    setIsSpeaking(true)
    synth.speak(utterance)
  }, [synth, voice, lang, ttsLangs])

  useEffect(() => cancel, [cancel])  // trap 11

  return {
    speak,
    cancel,
    isSpeaking,
    hasVoice: Boolean(voice),   // trap 12
    isSupported: Boolean(synth),
    voiceName: voice?.name ?? null,
  }
}
```

### Minimal component

```jsx
function Capture({ lang, ttsLangs, onText }) {
  const speech = useSpeech({ lang, onFinalResult: onText })
  const [settled, setSettled] = useState('')

  if (!speech.isSupported) {
    return <p>Voice input isn't available in this browser. Use Chrome or Edge.</p>
  }

  return (
    <div>
      <div aria-live="polite">
        {/* The distinction is weight and opacity: no colour, no motion. */}
        <span className="font-semibold text-black">{settled}</span>{' '}
        <span className="font-light text-black/45">{speech.interimText}</span>
      </div>

      <button onClick={speech.isListening ? speech.stop : speech.start}
              aria-pressed={speech.isListening}>
        {speech.isListening ? 'Stop listening' : 'Start listening'}
      </button>

      {speech.error && <p role="alert">{speech.error.code}</p>}
    </div>
  )
}
```

### `public/mic-test.html`

A standalone page that drives the API with no framework involved. It answers the only question that matters when speech misbehaves: is the bug in your code or in the environment? Copy `public/mic-test.html` from this project; it logs `onstart`, `onaudiostart`, `onsoundstart`, `onspeechstart`, `onresult`, `onerror` with the raw error string, and `onend`, plus `navigator.permissions.query({name:'microphone'})`, a `getUserMedia` attempt with track labels, and the installed voice list filtered by language.

---

## Notes on scope

- **Browser support is the real constraint.** Chrome and Edge implement `SpeechRecognition`. Firefox does not implement it at all. Safari's support is partial and inconsistent. Any project relying on this needs a typed-input fallback, and that fallback should share the same code path as speech so it is not a second implementation to maintain.
- **Recognition is a cloud call in Chrome.** Audio goes to Google's servers for transcription. It is not on-device, it needs a network connection, and that has privacy implications worth stating in any project handling sensitive speech.
- **Synthesis is local** and works offline, but the available voices are whatever the operating system has installed, which you do not control.
- **If you need offline, cross-browser, or dialect-tuned recognition**, this API is the wrong tool and you want Whisper or similar behind your own endpoint. Structuring the code as above means that swap touches one file.
