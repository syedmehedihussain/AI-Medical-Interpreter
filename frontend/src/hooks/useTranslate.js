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

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  return { translate, isLoading, error, result, reset }
}
