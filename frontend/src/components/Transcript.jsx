import { useEffect, useRef } from 'react'
import { getDisplayLabel, isBengali } from '../lib/languages'
import { COPY } from '../lib/messages'

/**
 * Session transcript -- prd.md F-6.
 *
 * Append-only, newest at the bottom, React state only. A refresh loses it, and
 * the empty-state copy says so, so nobody is surprised (decisions.md D-006).
 *
 * Entry field names match schema.md section 3 exactly, because in v0.2 these
 * objects serialise straight into transcript rows.
 */

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function Line({ code, text }) {
  const bengali = isBengali(code)
  return (
    <div className="flex gap-2.5">
      <span className="mt-1 w-8 shrink-0 rounded bg-slate-100 px-1 py-0.5 text-center font-mono text-[10px] font-semibold uppercase text-slate-600">
        {code}
      </span>
      <p className={`flex-1 ${bengali ? 'font-bn text-bn' : 'text-base'} text-slate-800`}>{text}</p>
    </div>
  )
}

export default function Transcript({ entries, onClear }) {
  const endRef = useRef(null)

  // prd.md F-6: newest scrolled into view. Only the list scrolls, so this does
  // not yank the whole page while someone is reading further up.
  useEffect(() => {
    if (entries.length) endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [entries.length])

  return (
    <section className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6" aria-labelledby="transcript-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="transcript-heading" className="text-xs font-medium uppercase tracking-wide text-slate-500">
          This session
        </h2>
        {entries.length > 0 && (
          <button
            type="button"
            // prd.md F-6: confirm, because there is no undo.
            onClick={() => {
              if (window.confirm(COPY.clearConfirm)) onClear()
            }}
            className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            Clear
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm leading-relaxed text-slate-400">{COPY.transcriptEmpty}</p>
      ) : (
        <ol className="max-h-80 space-y-4 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-slate-200 px-3 py-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-slate-400">
                  {getDisplayLabel(entry.sourceLang)} to {getDisplayLabel(entry.targetLang)}
                  {entry.inputMode === 'voice' ? ' · voice' : ' · typed'}
                </span>
                <time className="font-mono text-[11px] text-slate-400" dateTime={entry.timestamp}>
                  {formatTime(entry.timestamp)}
                </time>
              </div>
              <div className="space-y-1.5">
                <Line code={entry.sourceLang} text={entry.sourceText} />
                <Line code={entry.targetLang} text={entry.translatedText} />
              </div>
            </li>
          ))}
          <li ref={endRef} aria-hidden="true" />
        </ol>
      )}
    </section>
  )
}
