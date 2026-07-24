/**
 * The only file in the frontend that calls fetch.
 *
 * No component may call fetch directly. Everything network-shaped goes through
 * here, which is what makes the envelope unwrapping, the error vocabulary, and
 * the timeout consistent instead of re-implemented per component.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/** prd.md E-15: abort a request that takes longer than this. */
const TIMEOUT_MS = 15000

/**
 * An error with the backend's own error code attached.
 *
 * Components switch on `code` to pick a message from the copy table, so they
 * never parse or display a raw network error.
 */
export class ApiError extends Error {
  constructor(code, message, retryable = false) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.retryable = retryable
  }
}

/**
 * Run a fetch with a timeout, unwrap the envelope, and normalise every failure
 * into an ApiError.
 *
 * `signal` lets a caller abort an in-flight request when a newer one starts
 * (prd.md E-17). It is combined with the internal timeout signal, so whichever
 * fires first wins.
 */
async function request(path, { method = 'GET', body, signal } = {}) {
  const timeoutController = new AbortController()
  const timer = setTimeout(() => timeoutController.abort(), TIMEOUT_MS)

  // Two independent reasons to abort: the caller superseded this request, or
  // it ran too long. AbortSignal.any merges them.
  const signals = [timeoutController.signal]
  if (signal) signals.push(signal)
  const combined = AbortSignal.any ? AbortSignal.any(signals) : timeoutController.signal

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: combined,
    })
  } catch (err) {
    clearTimeout(timer)
    // A caller-driven abort is not an error condition; let the caller detect
    // it and discard the result quietly (E-17).
    if (signal?.aborted) throw new ApiError('ABORTED', 'Request superseded.', false)
    if (err.name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'That took too long. Try again.', true)
    }
    // fetch only rejects on a network-level failure: server down, DNS, CORS.
    throw new ApiError(
      'NETWORK_ERROR',
      "Can't reach the translation service. Check your connection.",
      true,
    )
  } finally {
    clearTimeout(timer)
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // A non-JSON body means something upstream of the app answered -- a proxy
    // error page, usually. Treat it as an unusable response rather than
    // crashing on the parse.
    throw new ApiError('INTERNAL_ERROR', 'Translation failed. Try again.', true)
  }

  if (!response.ok) {
    const error = payload?.error ?? {}
    throw new ApiError(
      error.code || 'INTERNAL_ERROR',
      error.message || 'Translation failed. Try again.',
      Boolean(error.retryable),
    )
  }

  // Every successful response is {data, meta}. Callers get `data` and are kept
  // unaware of the envelope; `meta` is attached non-enumerably for debugging.
  return payload.data
}

export function getHealth({ signal } = {}) {
  return request('/api/health', { signal })
}

export function getLanguages({ signal } = {}) {
  return request('/api/languages', { signal })
}

export function translate({ text, sourceLang, targetLang, context = 'general', signal }) {
  return request('/api/translate/text', {
    method: 'POST',
    // Field names are snake_case on the wire, camelCase in the app. The
    // conversion happens here so no component has to remember it.
    body: {
      text,
      source_lang: sourceLang,
      target_lang: targetLang,
      context,
    },
    signal,
  })
}
