import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { speechUrl } from '../api/client'
import { getLanguage } from '../lib/languages'

/**
 * Speech synthesis -- prd.md F-4, edge cases E-21 and E-22.
 *
 * Bangla voice availability is genuinely inconsistent across operating systems
 * (scope.md section 7): Android and Windows usually have one, some Linux and
 * older iOS builds do not. So "no voice" is a first-class state, not an error:
 * the text is still on screen and readable, which is a degraded state rather
 * than a failure.
 */

/** Normalise 'bn_BD' and 'BN-bd' to 'bn-bd' for comparison. */
function normalise(tag) {
  return String(tag || '').toLowerCase().replace('_', '-')
}

/**
 * Best available voice for a language, walking the fallback list in order.
 *
 * For each candidate tag, an exact match wins; otherwise a voice whose tag
 * starts with the same primary subtag is accepted, so a system offering only
 * 'bn-IN' still serves a request for 'bn-BD'.
 */
export function pickVoice(voices, ttsLangs) {
  if (!voices.length) return null
  for (const candidate of ttsLangs) {
    const wanted = normalise(candidate)
    const exact = voices.find((voice) => normalise(voice.lang) === wanted)
    if (exact) return exact
    const primary = wanted.split('-')[0]
    const loose = voices.find((voice) => normalise(voice.lang).split('-')[0] === primary)
    if (loose) return loose
  }
  return null
}

export function useSpeak({ lang }) {
  const [voices, setVoices] = useState([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  // Set once the backend has failed to produce audio. Stops every later
  // translation retrying a route that is evidently unavailable, and lets the
  // UI honestly report that playback is not possible.
  const [serverFailed, setServerFailed] = useState(false)
  const utteranceRef = useRef(null)
  const audioRef = useRef(null)

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

  // getVoices() is empty on first call in Chrome and populates asynchronously,
  // firing voiceschanged. Reading it once on mount is the single most common
  // reason "speech synthesis doesn't work" -- it usually just wasn't ready.
  useEffect(() => {
    if (!synth) return undefined

    const load = () => setVoices(synth.getVoices() ?? [])
    load()
    synth.addEventListener?.('voiceschanged', load)
    return () => synth.removeEventListener?.('voiceschanged', load)
  }, [synth])

  const voice = useMemo(() => {
    const language = getLanguage(lang)
    if (!language) return null
    return pickVoice(voices, language.ttsLangs)
  }, [voices, lang])

  const cancel = useCallback(() => {
    synth?.cancel()
    // Server audio is a separate playback channel and has to be stopped too,
    // or cancelling only silences half the possible sources.
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
    setIsSpeaking(false)
  }, [synth])

  /**
   * Speak via the backend when the browser has no local voice.
   *
   * The operating system decides which voices exist and most desktop Linux
   * installs have no Bangla voice, so the frontend alone cannot fix this
   * (decisions.md D-016). Local voices are still preferred when present:
   * they are lower latency, work offline, and cost no bandwidth.
   */
  const speakViaServer = useCallback((text, targetLang) => {
    const audio = new Audio(speechUrl({ text, lang: targetLang }))
    audioRef.current = audio
    audio.onended = () => setIsSpeaking(false)
    audio.onerror = () => {
      setIsSpeaking(false)
      setServerFailed(true)
    }
    setIsSpeaking(true)
    // play() rejects when the browser's autoplay policy blocks audio that no
    // user gesture led to. Not an error worth showing: the manual speaker
    // button remains, and pressing it is itself the gesture that unblocks it.
    audio.play().catch(() => setIsSpeaking(false))
    return true
  }, [])

  const speak = useCallback(
    (text) => {
      // Deliberately not gated on `synth`. A browser with no speechSynthesis
      // at all can still play server audio, so requiring it here would
      // disable playback for exactly the users who need the fallback most.
      if (!text?.trim()) return false

      // prd.md E-22: a new translation interrupts the previous utterance
      // rather than queueing behind it. In a consultation, the current
      // sentence is the only one that matters. Cancels both channels.
      cancel()

      // No local voice: use the backend (D-016).
      //
      // Never fall through to speaking anyway. Handing Bengali text to
      // speechSynthesis with lang="bn-BD" and no Bengali voice does NOT
      // fail -- the platform substitutes its default, and an English voice
      // reading Bengali codepoints produces confident-sounding nonsense that
      // a clinician might trust. Server audio or silence, never that.
      if (!voice) {
        if (serverFailed) return false
        return speakViaServer(text, lang)
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voice
      utterance.lang = voice.lang
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      utteranceRef.current = utterance
      setIsSpeaking(true)
      synth.speak(utterance)
      return true
    },
    [synth, voice, lang, cancel, serverFailed, speakViaServer],
  )

  // A page that navigates away mid-sentence keeps talking otherwise; the
  // utterance outlives the component.
  useEffect(() => cancel, [cancel])

  return {
    speak,
    cancel,
    isSpeaking,
    // prd.md E-21: false disables the speaker button with an explanation.
    // True when either channel can serve, since from the user's point of view
    // the only question is whether pressing the button produces speech.
    hasVoice: Boolean(voice) || !serverFailed,
    // Which channel is in use, for the tooltip and for honest reporting.
    usingServerVoice: !voice && !serverFailed,
    isSupported: Boolean(synth),
    voiceName: voice?.name ?? null,
  }
}
