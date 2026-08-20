/**
 * Build and print the session report as a prescription.
 *
 * The user asked for a downloadable PDF. Rather than pull in a PDF library, the
 * report is assembled as a self-contained HTML document and opened in a new
 * window that invokes the browser's print dialog, where the clinician picks
 * "Save as PDF". Keeping the whole prescription in one HTML string (with inline
 * styles) means the print output is exactly this document, independent of the
 * app's own DOM and CSS.
 *
 * buildPrescriptionHTML is pure and unit-tested; openPrintWindow is the thin
 * browser wrapper that shows it.
 */

const VAULT_URL = 'https://med-vault-orpin.vercel.app/welcome'

/** Escape user/model text so a stray < & " cannot break the document markup. */
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** "2×/day" for a bare number, otherwise the phrase as given. */
function timesLabel(times) {
  const value = String(times ?? '').trim()
  if (!value) return ''
  return /^\d+$/.test(value) ? `${value}×/day` : value
}

function formatDate(date) {
  try {
    return date.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return date.toISOString()
  }
}

function medicationRows(medications) {
  if (!medications || medications.length === 0) {
    return '<tr><td colspan="4" class="empty">No medications were recorded in this session.</td></tr>'
  }
  return medications
    .map((med) => {
      const times = timesLabel(med.timesPerDay)
      return (
        '<tr>' +
        `<td class="rx-name">${escapeHtml(med.name)}</td>` +
        `<td>${escapeHtml(med.dosage) || '&mdash;'}</td>` +
        `<td>${escapeHtml(times) || '&mdash;'}</td>` +
        `<td>${escapeHtml(med.timing) || '&mdash;'}</td>` +
        '</tr>'
      )
    })
    .join('')
}

/**
 * Return the full prescription HTML document.
 *
 * @param {object}   opts
 * @param {string}   opts.summary       AI conversation summary (may be empty).
 * @param {object[]} opts.medications   Confirmed meds ({name,dosage,timesPerDay,timing}).
 * @param {string}   [opts.langLabel]   e.g. "English ↔ বাংলা", shown in the header.
 * @param {Date}     [opts.generatedAt] Timestamp for the header.
 */
export function buildPrescriptionHTML({ summary, medications, langLabel = '', generatedAt = new Date() } = {}) {
  const summaryHtml = summary && summary.trim()
    ? `<pre class="summary">${escapeHtml(summary.trim())}</pre>`
    : '<p class="muted">No summary was generated for this session.</p>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Mita — Consultation Report</title>
<style>
  * { box-sizing: border-box; }
  :root { --green:#1f8a3f; --ink:#1f2937; --muted:#6b7280; --line:#e5e7eb; }
  html, body { margin:0; padding:0; color:var(--ink);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .page { max-width: 760px; margin: 0 auto; padding: 32px 36px 120px; }

  header.rx { display:flex; align-items:flex-start; justify-content:space-between;
    gap:16px; border-bottom:3px solid var(--green); padding-bottom:16px; }
  .brand { display:flex; align-items:center; gap:12px; }
  .brand .mark { width:44px; height:44px; border-radius:12px; background:var(--green);
    display:flex; align-items:center; justify-content:center; }
  .brand .mark svg { width:24px; height:24px; }
  .brand h1 { margin:0; font-size:22px; letter-spacing:-0.01em; }
  .brand .sub { margin:2px 0 0; font-size:12px; color:var(--muted); }
  .meta { text-align:right; font-size:12px; color:var(--muted); line-height:1.5; }
  .meta .rx-symbol { font-size:28px; font-weight:700; color:var(--green); font-family:Georgia,"Times New Roman",serif; }

  h2 { font-size:12px; letter-spacing:0.14em; text-transform:uppercase; color:var(--muted);
    margin:28px 0 10px; }
  .summary { white-space:pre-wrap; font-family:inherit; font-size:14px; line-height:1.6;
    margin:0; padding:14px 16px; background:#f6f8f6; border:1px solid var(--line); border-radius:10px; }
  .muted { color:var(--muted); font-size:14px; }

  table { width:100%; border-collapse:collapse; font-size:14px; }
  th { text-align:left; font-size:11px; letter-spacing:0.08em; text-transform:uppercase;
    color:var(--muted); border-bottom:2px solid var(--line); padding:8px 10px; }
  td { padding:10px; border-bottom:1px solid var(--line); vertical-align:top; }
  td.rx-name { font-weight:600; }
  td.empty { color:var(--muted); text-align:center; padding:18px; }

  footer.rx { position:fixed; bottom:0; left:0; right:0; }
  .foot-inner { max-width:760px; margin:0 auto; padding:14px 36px 22px; }
  .sign { display:flex; justify-content:flex-end; margin-bottom:14px; }
  .sign .box { width:260px; text-align:center; }
  .sign .line { border-top:1px solid #9ca3af; margin-bottom:6px; height:46px; }
  .sign .label { font-size:11px; color:var(--muted); letter-spacing:0.05em; text-transform:uppercase; }
  .disclaimer { border-top:1px solid var(--line); padding-top:10px; font-size:11px; color:var(--muted);
    line-height:1.5; }
  .disclaimer strong { color:var(--ink); }

  @media print { @page { margin:14mm; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
  <div class="page">
    <header class="rx">
      <div class="brand">
        <span class="mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" aria-hidden="true">
            <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke-linejoin="round" />
            <path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <div>
          <h1>AI Medical Interpreter &middot; Mita</h1>
          <p class="sub">Real-time medical interpreter${langLabel ? ` &middot; ${escapeHtml(langLabel)}` : ''}</p>
        </div>
      </div>
      <div class="meta">
        <div class="rx-symbol">&#8478;</div>
        <div>${escapeHtml(formatDate(generatedAt))}</div>
        <div>Consultation report</div>
      </div>
    </header>

    <h2>Consultation summary</h2>
    ${summaryHtml}

    <h2>Medications</h2>
    <table>
      <thead>
        <tr><th>Medicine</th><th>Dosage</th><th>Times / day</th><th>Timing</th></tr>
      </thead>
      <tbody>
        ${medicationRows(medications)}
      </tbody>
    </table>
  </div>

  <footer class="rx">
    <div class="foot-inner">
      <div class="sign">
        <div class="box">
          <div class="line"></div>
          <div class="label">Doctor's signature &amp; seal</div>
        </div>
      </div>
      <p class="disclaimer">
        <strong>This is an AI-generated prescription.</strong> It is a translation aid, not a medical
        diagnosis. Please have it reviewed, signed, and sealed by a licensed doctor before it is acted on.
      </p>
    </div>
  </footer>
</body>
</html>`
}

/**
 * Open the prescription in a new window and trigger the print / Save-as-PDF
 * dialog. Returns false if the popup was blocked so the caller can react.
 */
export function openPrintWindow(html) {
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  // Print once the document's resources have painted; the setTimeout is a
  // fallback for browsers where onload has already fired by the time we attach.
  win.onload = () => win.print()
  setTimeout(() => {
    try {
      win.print()
    } catch {
      // Window may have been closed already; nothing to do.
    }
  }, 400)
  return true
}

export { VAULT_URL, escapeHtml }
