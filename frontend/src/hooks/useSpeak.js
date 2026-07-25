import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
function pickVoice(voices, ttsLangs) {
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
  const utteranceRef = useRef(null)

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
    if (!synth) return
    synth.cancel()
    setIsSpeaking(false)
  }, [synth])

  const speak = useCallback(
    (text) => {
      if (!synth || !text?.trim()) return
      // prd.md E-22: a new translation interrupts the previous utterance
      // rather than queueing behind it. In a consultation, the current
      // sentence is the only one that matters.
      synth.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang
      } else {
        // No matching voice: hand the tag over anyway and let the platform do
        // what it can. hasVoice already told the UI to disable the control.
        utterance.lang = getLanguage(lang)?.ttsLangs?.[0] ?? lang
      }
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      utteranceRef.current = utterance
      setIsSpeaking(true)
      synth.speak(utterance)
    },
    [synth, voice, lang],
  )

  // A page that navigates away mid-sentence keeps talking otherwise; the
  // utterance outlives the component.
  useEffect(() => cancel, [cancel])

  return {
    speak,
    cancel,
    isSpeaking,
    // prd.md E-21: false disables the speaker button with an explanation.
    hasVoice: Boolean(voice),
    isSupported: Boolean(synth),
    voiceName: voice?.name ?? null,
  }
}
