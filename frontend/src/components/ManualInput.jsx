import { useEffect, useRef, useState } from 'react'
import { getDisplayLabel, isBengali } from '../lib/languages'
import { COPY } from '../lib/messages'

const MAX_LENGTH = 500

/**
 * Type instead of speaking -- prd.md F-5.
 *
 * Collapsed behind a disclosure so it does not compete with the voice flow,
 * but expanded by default when voice is unavailable (E-1, E-2).
 *
 * This is NOT a separate code path. It calls the same translate function the
 * speech flow calls; the only difference is where the text came from.
 */
export default function ManualInput({ open, onOpenChange, onSubmit, isLoading, sourceLang }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)
  const bengali = isBengali(sourceLang)

  // Move focus into the box when it opens, so the keyboard path is usable
  // without a second Tab press.
  useEffect(() => {
    if (open) textareaRef.current?.focus()
  }, [open])

  const trimmed = text.trim()
  const canSubmit = trimmed.length > 0 && !isLoading

  const submit = () => {
    if (!canSubmit) return
    onSubmit(trimmed)
    setText('')
  }

  const handleKeyDown = (event) => {
    // prd.md F-5: Enter submits, Shift+Enter inserts a newline.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <section className="border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls="manual-input-panel"
        className="flex w-full items-center gap-1.5 py-3 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <svg
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {COPY.manualDisclosure}
      </button>

      {open && (
        <div id="manual-input-panel" className="pb-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            rows={3}
            maxLength={MAX_LENGTH}
            placeholder={`Type in ${getDisplayLabel(sourceLang)}...`}
            aria-label={`Text to translate, in ${getDisplayLabel(sourceLang)}`}
            className={`w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder:text-slate-400 ${
              bengali ? 'font-bn text-bn' : 'text-base'
            }`}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {/* Only worth showing as the cap approaches (E-11). */}
              {text.length > MAX_LENGTH - 100 ? `${text.length} / ${MAX_LENGTH}` : 'Enter to translate'}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {COPY.manualSubmit}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
