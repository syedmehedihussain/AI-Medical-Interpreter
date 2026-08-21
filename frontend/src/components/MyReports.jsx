import { useCallback, useEffect, useState } from 'react'
import { deleteReport, getReport, listReports } from '../api/client'
import { getDisplayLabel, isBengali } from '../lib/languages'
import { buildPrescriptionHTML, openPrintWindow } from '../lib/report'

function langLabel(pair) {
  const [a, b] = (pair || '').split('-')
  if (!a || !b) return ''
  return `${getDisplayLabel(a)} → ${getDisplayLabel(b)}`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** One Doctor/Patient turn, mirroring the live transcript layout. */
function TranscriptTurn({ turn }) {
  const doctorSide = turn.speaker ? turn.speaker === 'doctor' : turn.sourceLang === 'en'
  return (
    <div className="space-y-1.5">
      <div className={doctorSide ? 'text-left' : 'text-right'}>
        <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {doctorSide ? 'Doctor' : 'Patient'}
        </p>
        <p className={`${isBengali(turn.sourceLang) ? 'font-bn text-bn' : 'text-[15px]'} text-slate-700`}>{turn.sourceText}</p>
      </div>
      <div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-brand-600">
          Mita · {getDisplayLabel(turn.targetLang)}
        </p>
        <p className={`${isBengali(turn.targetLang) ? 'font-bn text-bn' : 'text-[15px]'} text-slate-800`}>{turn.translatedText}</p>
      </div>
    </div>
  )
}

function ReportDetail({ report, onBack, onDownload, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-slate-900">{report.title || 'Consultation'}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {formatDate(report.created_at)}
            {report.language_pair ? ` · ${langLabel(report.language_pair)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onDownload(report)} className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download
          </button>
          {confirming ? (
            <span className="flex items-center gap-1.5 text-sm text-clay-700">
              Remove?
              <button type="button" onClick={() => onDelete(report.id)} className="rounded-full bg-clay-500 px-3 py-1 text-xs font-semibold text-white hover:bg-clay-600">Yes</button>
              <button type="button" onClick={() => setConfirming(false)} className="text-xs font-medium text-slate-500 hover:text-slate-800">No</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-clay-600">
              Delete
            </button>
          )}
        </div>
      </div>

      <h3 className="mt-8 mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">Consultation summary</h3>
      {report.summary?.trim() ? (
        <p className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-[14px] leading-relaxed text-slate-700">{report.summary}</p>
      ) : (
        <p className="text-sm text-slate-400">No summary was saved.</p>
      )}

      <h3 className="mt-6 mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">Medications</h3>
      <div className="rounded-2xl border border-slate-200 bg-white">
        {(report.medications ?? []).length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">No medications recorded.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {report.medications.map((med, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-sm font-semibold text-slate-800">{med.name}</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {[med.dosage, med.timesPerDay && (/^\d+$/.test(med.timesPerDay) ? `${med.timesPerDay}×/day` : med.timesPerDay), med.timing].filter(Boolean).join(' · ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 className="mt-6 mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">Dialogue</h3>
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4">
        {(report.transcript ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">No dialogue saved.</p>
        ) : (
          report.transcript.map((turn, i) => <TranscriptTurn key={i} turn={turn} />)
        )}
      </div>

      <button type="button" onClick={onBack} className="mt-8 flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All reports
      </button>
    </div>
  )
}

/**
 * The "My reports" screen: a list of saved consultations, each opening a full
 * detail with the dialogue transcript, summary, and medications, and a
 * re-download of the prescription PDF.
 */
export default function MyReports({ getToken, onBack }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const data = await listReports({ token })
      setReports(data.reports ?? [])
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  const open = useCallback(async (id) => {
    setDetailLoading(true)
    try {
      const token = await getToken()
      const data = await getReport({ id, token })
      setSelected(data)
    } catch (err) {
      setError(err)
    } finally {
      setDetailLoading(false)
    }
  }, [getToken])

  const download = useCallback((report) => {
    const [a, b] = (report.language_pair || '').split('-')
    openPrintWindow(
      buildPrescriptionHTML({
        summary: report.summary,
        medications: report.medications ?? [],
        langLabel: a && b ? `${getDisplayLabel(a)} ↔ ${getDisplayLabel(b)}` : '',
        generatedAt: report.created_at ? new Date(report.created_at) : new Date(),
      }),
    )
  }, [])

  const remove = useCallback(async (id) => {
    try {
      const token = await getToken()
      await deleteReport({ id, token })
      setSelected(null)
      await refresh()
    } catch (err) {
      setError(err)
    }
  }, [getToken, refresh])

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-slate-900">My reports</h1>
            <p className="mt-0.5 text-sm text-slate-500">Saved consultations — dialogue, summary, and prescription.</p>
          </div>
          <button type="button" onClick={onBack} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Back to session
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {selected ? (
            <ReportDetail report={selected} onBack={() => setSelected(null)} onDownload={download} onDelete={remove} />
          ) : detailLoading || loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
          ) : error ? (
            <div className="py-8 text-center text-sm text-clay-700">
              Couldn&rsquo;t load your reports.{' '}
              <button type="button" onClick={refresh} className="font-semibold underline">Try again</button>
            </div>
          ) : reports.length === 0 ? (
            <p className="py-8 text-center text-sm leading-relaxed text-slate-400">
              No saved reports yet. Run a consultation and choose <span className="font-semibold text-slate-600">Save your report</span>.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => open(r.id)}
                  className="flex w-full items-center justify-between gap-4 py-3.5 text-left transition hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{r.title || 'Consultation'}</span>
                    <span className="mt-0.5 block font-mono text-xs text-slate-400">
                      {formatDate(r.created_at)}
                      {r.language_pair ? ` · ${langLabel(r.language_pair)}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                    {r.medication_count} med{r.medication_count === 1 ? '' : 's'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
