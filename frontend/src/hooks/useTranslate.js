import { useCallback, useRef, useState } from 'react'
import { ApiError, translate as translateRequest } from '../api/client'

/**
 * Translation requests with race handling -- prd.md F-3 and edge case E-17.
 *
 * The problem this exists to solve: speech finalises segments faster than the
 * network answers. Without care, an older response can land after a newer one
 * and overwrite the output panel with stale text. Two guards prevent that:
 *
 *   1. Starting a request aborts the previous one still in flight.
 *   2. Each request carries a sequence number, and only a response whose
 *      number matches the latest issued is allowed to touch state.
 *
 * The second guard matters on its own because abort is not instantaneous -- a
 * response can already be in the microtask queue when abort() is called.
 */
export function useTranslate() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const controllerRef = useRef(null)
  const sequenceRef = useRef(0)

  const translate = useCallback(async ({ text, sourceLang, targetLang, context = 'general' }) => {
    const trimmed = (text ?? '').trim()
    // prd.md F-3: empty input is rejected client-side with no network call.
    if (!trimmed) return null

    // Abandon whatever was in flight; its result is now irrelevant.
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    const sequence = ++sequenceRef.current
    const isStale = () => sequence !== sequenceRef.current

    setIsLoading(true)
    setError(null)

    try {
      const data = await translateRequest({
        text: trimmed,
        sourceLang,
        targetLang,
        context,
        signal: controller.signal,
      })
      if (isStale()) return null

      // prd.md E-19: an empty string back is a failure, not a result.
      if (!data?.translated_text?.trim()) {
        setError(new ApiError('EMPTY_TRANSLATION', 'No translation returned. Try rephrasing.', false))
        return null
      }

      setResult(data)
      return data
    } catch (err) {
      // A superseded request is not a failure the user should ever see.
      if (err.code === 'ABORTED' || isStale()) return null
      setError(err)
      return null
    } finally {
      // Only the newest request may clear the loading flag, otherwise an
      // aborted older one turns the spinner off while the new one is running.
      if (!isStale()) setIsLoading(false)
    }
  }, [])

  /**
   * Translate a passage that has been split into sentence-sized chunks, as one
   * logical request.
   *
   * The record-until-Done mic (App.jsx) hands over a whole utterance, which
   * chunkBySentence may break into several <=500-char pieces to fit the backend
   * limit. Those pieces must be translated together and shown as one exchange.
   *
   * The single-`translate` race handling above cannot be looped for this: it
   * aborts the previous in-flight request, so calling it per chunk would make
   * each chunk abort the one before it. Instead the whole batch shares ONE
   * AbortController and ONE sequence number, so a newer Done still supersedes an
   * older batch, but the chunks within a batch run sequentially without
   * cancelling each other. The pieces are then merged into a single object
   * shaped like one /api/translate response, so the caller builds one entry.
   */
  const translateChunks = useCallback(
    async (chunks, { sourceLang, targetLang, context = 'general' }) => {
      const clean = (chunks ?? []).map((c) => (c ?? '').trim()).filter(Boolean)
      if (!clean.length) return null

      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      const sequence = ++sequenceRef.current
      const isStale = () => sequence !== sequenceRef.current

      setIsLoading(true)
      setError(null)

      try {
        const parts = []
        for (const text of clean) {
          const data = await translateRequest({
            text,
            sourceLang,
            targetLang,
            context,
            signal: controller.signal,
          })
          // A newer batch started while this one was mid-flight; drop it.
          if (isStale()) return null
          parts.push(data)
        }

        const merged = {
          source_text: clean.join(' '),
          translated_text: parts
            .map((p) => p.translated_text ?? '')
            .join(' ')
            .trim(),
          source_lang: sourceLang,
          target_lang: targetLang,
          detected_dialect: null,
          confidence: null,
          risk_flags: parts.flatMap((p) => p.risk_flags ?? []),
          needs_review: parts.some((p) => Boolean(p.needs_review)),
          context,
        }

        // prd.md E-19: an empty string back is a failure, not a result.
        if (!merged.translated_text) {
          setError(new ApiError('EMPTY_TRANSLATION', 'No translation returned. Try rephrasing.', false))
          return null
        }

        setResult(merged)
        return merged
      } catch (err) {
        if (err.code === 'ABORTED' || isStale()) return null
        setError(err)
        return null
      } finally {
        if (!isStale()) setIsLoading(false)
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  return { translate, translateChunks, isLoading, error, result, reset }
}
