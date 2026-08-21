import PageHeader from './PageHeader'
import { Reveal, Stagger, StaggerItem } from './motion'

const STEPS = [
  { n: '1', title: 'Choose who’s speaking', body: 'Pick Doctor or Patient. Their language becomes the source; the other becomes the target.' },
  { n: '2', title: 'Speak or type', body: 'Hold the mic and talk, then tap Done — or type a sentence and press Enter.' },
  { n: '3', title: 'Read and play back', body: 'The translation appears at once and can be played aloud for the other person.' },
  { n: '4', title: 'Confirm medications', body: 'Any drug the model hears is shown for you to confirm or fix before it’s added.' },
]

const TROUBLESHOOTING = [
  {
    q: 'The microphone isn’t working',
    a: 'Voice input needs Chrome or Edge, and permission to use the mic. Click the padlock in the address bar and allow the microphone, then reload. You can always type instead.',
  },
  {
    q: 'The translation seems slow or fails',
    a: 'Translation runs through a cloud model, so a connection is required. If a request fails, use the Retry button; if it keeps failing, check your network.',
  },
  {
    q: 'My report didn’t save',
    a: 'Saving needs an account. In the demo nothing is saved. Sign up or log in, then use Save report at the bottom of a session.',
  },
  {
    q: 'Bangla text looks wrong',
    a: 'The app loads a Bangla webfont; a very old browser may not render it. Update your browser or try Chrome/Edge.',
  },
]

export default function Help({ onHome, onBack, onGetStarted }) {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader onHome={onHome} onBack={onBack} />
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-4 sm:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Help</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-slate-900 sm:text-4xl">How it works</h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-500">
            A quick guide to running a consultation, plus fixes for the usual snags.
          </p>
        </Reveal>

        <Stagger className="mt-10 grid gap-6 sm:grid-cols-2">
          {STEPS.map((s) => (
            <StaggerItem key={s.n} className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 font-mono text-sm font-bold text-brand-700">
                {s.n}
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{s.body}</p>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mt-14">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Troubleshooting</h2>
          <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            {TROUBLESHOOTING.map((t) => (
              <details key={t.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-slate-900">
                  {t.q}
                  <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M10 4v12M4 10h12" strokeLinecap="round" />
                  </svg>
                </summary>
                <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-slate-600">{t.a}</p>
              </details>
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-14 overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-8 text-center sm:p-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Ready to try it?</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-slate-600">
            Start a live consultation. No account needed for the demo.
          </p>
          <button
            type="button"
            onClick={onGetStarted}
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-brand-700 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-700/25 transition hover:bg-brand-800 hover:-translate-y-0.5"
          >
            Get started
            <svg viewBox="0 0 20 20" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 10h12m0 0-5-5m5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </Reveal>
      </div>
    </div>
  )
}
