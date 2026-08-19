/**
 * Landing / home screen.
 *
 * The one marketing surface in the app (design reference: Aida on the App
 * Store). Editorial hero, a single committed green accent, one job: get the
 * clinician into the tool. `onStart` swaps the view to the interpreter.
 *
 * Deliberately NOT claiming HIPAA like the reference does. We have no such
 * certification, so the trust cues here are only ones that are actually true:
 * real-time, bilingual, and nothing-is-stored (the app has no database).
 */

const FEATURES = [
  {
    n: '01',
    title: 'Real-time, both ways',
    body: 'Speak in English or Bangla and hear it back in the other, in the flow of the conversation, not after it.',
  },
  {
    n: '02',
    title: 'Tuned for the clinic',
    body: 'Drug names, dosages, numbers and units are preserved exactly. "Napa 500mg" stays "Napa 500mg".',
  },
  {
    n: '03',
    title: 'Speak or type',
    body: 'Voice when your hands are busy with a patient, typing when the room is loud. Same result either way.',
  },
]

function TrustChip({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-sm font-medium text-brand-800">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
      {children}
    </span>
  )
}

export default function Home({ onStart }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Signature organic blob, floating gently behind the content. Sits in a
          corner on mobile, larger and to the side on wide screens. */}
      <div
        aria-hidden="true"
        className="blob animate-float pointer-events-none absolute -right-24 -top-24 h-72 w-72 bg-brand-300/60 sm:h-[26rem] sm:w-[26rem] lg:-right-16 lg:h-[34rem] lg:w-[34rem]"
      />
      <div
        aria-hidden="true"
        className="blob pointer-events-none absolute -bottom-40 -left-32 h-80 w-80 bg-brand-100"
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 sm:px-10">
        {/* Wordmark row */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3v18M3 12h18" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-[15px] font-bold tracking-tight text-slate-900">AI Medical Interpreter</span>
          </div>
          <span className="hidden rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-slate-600 sm:inline">
            EN <span className="text-brand-600">&harr;</span> <span className="font-bn">বাংলা</span>
          </span>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col justify-center py-10 sm:py-16">
          <div className="max-w-3xl animate-rise-in">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
              Real-time medical interpreter
            </p>
            <h1 className="text-display text-5xl font-extrabold text-slate-900 sm:text-6xl lg:text-7xl">
              Care shouldn&rsquo;t get
              <br />
              lost in <span className="text-brand-600">translation.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              Speech-to-speech interpretation between a doctor and patient, in the moment.
              Bridge English and Bangla at the bedside without waiting on an interpreter to arrive.
            </p>

            {/* The button the whole screen exists for. */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onStart}
                className="group inline-flex items-center gap-3 rounded-full bg-brand-700 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-brand-700/25 transition hover:bg-brand-800 active:scale-[0.98]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
                  </svg>
                </span>
                Start interpreting
                <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14m0 0-6-6m6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="text-sm text-slate-500">No sign-up. Works in Chrome or Edge.</span>
            </div>

            {/* Honest trust cues only. */}
            <div className="mt-10 flex flex-wrap gap-3">
              <TrustChip>Live, in real time</TrustChip>
              <TrustChip>Nothing is saved</TrustChip>
              <TrustChip>Speak or type</TrustChip>
            </div>
          </div>
        </main>

        {/* Feature strip: an editorial numbered list, not a row of identical
            icon cards. Big index numerals carry the rhythm. */}
        <section className="grid gap-10 border-t border-slate-200/80 py-12 sm:grid-cols-3 sm:gap-8">
          {FEATURES.map((f) => (
            <div key={f.n}>
              <span className="font-mono text-sm font-semibold text-brand-500">{f.n}</span>
              <h3 className="mt-2 text-lg font-bold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
