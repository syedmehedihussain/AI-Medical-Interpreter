import { useCallback, useEffect, useRef, useState } from 'react'
import { getHealth } from './api/client'
import Header from './components/Header'
import LanguageBar from './components/LanguageBar'
import ManualInput from './components/ManualInput'
import OutputPanel from './components/OutputPanel'
import { useTranslate } from './hooks/useTranslate'
import { DEFAULT_SOURCE, DEFAULT_TARGET, getOther } from './lib/languages'

// prd.md F-1: the language pair survives a refresh.
const STORAGE_KEY = 'torongo.languagePair'

/**
 * Read the saved pair, defending against anything unusable in localStorage.
 *
 * Storage is user-writable and outlives code changes, so a value written by an
 * older build, or edited by hand, must not be able to crash the app on load.
 * Anything failing validation falls back to the default pair.
 */
function loadLanguagePair() {
  const fallback = { sourceLang: DEFAULT_SOURCE, targetLang: DEFAULT_TARGET }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const saved = JSON.parse(raw)
    if (!saved?.sourceLang || !saved?.targetLang) return fallback
    // A same-language pair is unreachable through the UI but trivially
    // writable by hand, so it is re-derived rather than trusted.
    if (saved.sourceLang === saved.targetLang) return fallback
    return { sourceLang: saved.sourceLang, targetLang: getOther(saved.sourceLang) }
  } catch {
    return fallback
  }
}

export default function App() {
  const [{ sourceLang, targetLang }, setLanguagePair] = useState(loadLanguagePair)
  const [backendReachable, setBackendReachable] = useState(null)
  const [manualOpen, setManualOpen] = useState(true)

  const { translate, isLoading, error, result } = useTranslate()

  // Remembered so the retry button can resend the exact same text.
  const lastRequestRef = useRef(null)

  // prd.md F-7: status is checked once on load, then driven by request
  // outcomes. A failed health call means Offline, not a blank screen.
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sourceLang, targetLang }))
    } catch {
      // Private browsing can make localStorage throw on write. Losing the
      // saved pair is not worth breaking the app over.
    }
  }, [sourceLang, targetLang])

  /**
   * The single translation entry point.
   *
   * Voice input in Stage 4 will call this same function. Typing is not a
   * separate pipeline; it just skips the speech step.
   */
  const runTranslation = useCallback(
    async (text, { inputMode = 'typed' } = {}) => {
      lastRequestRef.current = { text, inputMode }
      const data = await translate({ text, sourceLang, targetLang })
      // A completed round trip is the most reliable evidence the backend is
      // up, so it corrects the status the health check set on load.
      if (data) setBackendReachable(true)
      return data
    },
    [translate, sourceLang, targetLang],
  )

  // A network-level failure means Offline; a 400 or 500 does not, because the
  // server plainly answered. Driven off the error rather than the call site so
  // it cannot disagree with what OutputPanel is showing.
  useEffect(() => {
    if (error?.code === 'NETWORK_ERROR') setBackendReachable(false)
  }, [error])

  const retry = useCallback(() => {
    const last = lastRequestRef.current
    if (last) runTranslation(last.text, { inputMode: last.inputMode })
  }, [runTranslation])

  // Precedence matters: a live request outranks idle Ready, and an unreachable
  // backend outranks everything.
  let status = 'ready'
  if (backendReachable === false) status = 'offline'
  else if (isLoading) status = 'translating'

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col bg-white shadow-sm">
      <Header status={status} />

      <LanguageBar sourceLang={sourceLang} targetLang={targetLang} onChange={setLanguagePair} />

      <ManualInput
        open={manualOpen}
        onOpenChange={setManualOpen}
        onSubmit={(text) => runTranslation(text, { inputMode: 'typed' })}
        isLoading={isLoading}
        sourceLang={sourceLang}
      />

      <OutputPanel
        result={result}
        isLoading={isLoading}
        error={error}
        targetLang={targetLang}
        onRetry={retry}
      />

      <footer className="mt-auto px-4 py-4 text-center text-xs text-slate-400 sm:px-6">
        Torongo v0.1 &middot; typed input only; voice arrives in Stage 4
      </footer>
    </div>
  )
}
