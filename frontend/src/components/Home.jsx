import { useEffect, useRef, useState } from 'react'

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

const USE_CASES = [
  {
    title: 'Emergency triage',
    body: 'A patient arrives in distress speaking only Bangla. Ask about symptoms, onset and allergies straight away, without waiting for an interpreter to arrive.',
  },
  {
    title: 'Prescription counselling',
    body: 'Explain dosage and timing in the patient’s own language, with drug names and units carried across exactly as written.',
  },
  {
    title: 'Antenatal & routine checkups',
    body: 'Walk through history and instructions as a calm back-and-forth, so nothing is lost when the conversation changes direction.',
  },
  {
    title: 'Discharge instructions',
    body: 'Confirm the patient understands follow-up care and warning signs before they leave the room.',
  },
]

const DOCS = [
  { step: '1', title: 'Choose the direction', body: 'Pick who is speaking: English or বাংলা. The other language is set automatically.' },
  { step: '2', title: 'Speak or type', body: 'Hold the mic and talk, or type a sentence. Either path goes through the same translator.' },
  { step: '3', title: 'Read and play back', body: 'The translation appears at once and can be played aloud for the patient to hear.' },
  { step: '4', title: 'Confirm the domain', body: 'If a medical specialty is detected, confirm it before anything is routed. Nothing happens without you.' },
]

const FAQS = [
  {
    q: 'Is any of the conversation stored?',
    a: 'No. Audio is never saved, and transcripts stay in the browser on your device. Refreshing the page clears the session.',
  },
  {
    q: 'Which languages are supported?',
    a: 'English and Bangla, both directions. The interpreter keeps clinical terms, drug names and dosages exact rather than paraphrasing them.',
  },
  {
    q: 'Can it diagnose or give medical advice?',
    a: 'No. It only translates. It never infers a diagnosis, and any detected specialty is a hint you confirm, not a decision it makes.',
  },
  {
    q: 'Which browsers work for voice?',
    a: 'Chrome or Edge for speech input. Typing works in any modern browser, so the tool is fully usable either way.',
  },
  {
    q: 'Does it need an internet connection?',
    a: 'Yes. Translation runs through a cloud model, so the tool needs to be online during a session.',
  },
]

const RESOURCES = [
  { label: 'Blog', hint: 'Notes and updates' },
  { label: 'About us', hint: 'The team behind it' },
  { label: 'How we built it', hint: 'Architecture & decisions' },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 3v18M3 12h18" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-[15px] font-bold tracking-tight text-slate-900">AI Medical Interpreter</span>
    </div>
  )
}

function ResourceMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        Resource
        <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-3 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/[0.08]">
          {RESOURCES.map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setOpen(false)}
              className="flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
            >
              <span className="text-sm font-semibold text-slate-800">{r.label}</span>
              <span className="text-xs text-slate-400">{r.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Header({ onStart }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 sm:px-10">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          <a href="#use-cases" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">Use cases</a>
          <a href="#docs" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">Docs</a>
          <a href="#faq" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">FAQ</a>
          <ResourceMenu />
        </nav>
        <button
          type="button"
          onClick={onStart}
          className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 active:scale-[0.98]"
        >
          Start interpreting
        </button>
      </div>
    </header>
  )
}

function TrustChip({ children, accent }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-sm font-medium text-brand-800">
      <span className={`h-1.5 w-1.5 rounded-full ${accent ? 'bg-clay-500' : 'bg-brand-500'}`} aria-hidden="true" />
      {children}
    </span>
  )
}

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {children && <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{children}</p>}
    </div>
  )
}

export default function Home({ onStart }) {
  return (
    <div className="relative min-h-screen">
      <Header onStart={onStart} />

      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="blob animate-float pointer-events-none absolute -right-24 -top-24 h-72 w-72 bg-brand-300/50 sm:h-[26rem] sm:w-[26rem] lg:-right-16 lg:h-[34rem] lg:w-[34rem]"
        />

        <div className="relative mx-auto max-w-6xl px-6 sm:px-10">
          <main className="flex flex-col justify-center py-16 sm:py-24">
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

              <div className="mt-10 flex flex-wrap gap-3">
                <TrustChip accent>Live, in real time</TrustChip>
                <TrustChip>Nothing is saved</TrustChip>
                <TrustChip>Speak or type</TrustChip>
              </div>
            </div>

            <div className="mt-20 grid gap-10 border-t border-slate-200/80 pt-12 sm:grid-cols-3 sm:gap-8">
              {FEATURES.map((f) => (
                <div key={f.n}>
                  <span className="font-mono text-sm font-semibold text-brand-500">{f.n}</span>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{f.body}</p>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-24 px-6 pb-28 sm:px-10">
        <section id="use-cases" className="scroll-mt-24">
          <SectionHeading eyebrow="Use cases" title="Built for the moments that can't wait">
            Where a language gap slows care down, the interpreter keeps the conversation moving.
          </SectionHeading>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <div key={u.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-900">{u.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{u.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="docs" className="scroll-mt-24">
          <SectionHeading eyebrow="Docs" title="How it works, in four steps">
            No setup and no account. Open the tool and you are ready.
          </SectionHeading>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {DOCS.map((d) => (
              <div key={d.step}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 font-mono text-sm font-bold text-brand-700">
                  {d.step}
                </span>
                <h3 className="mt-3 text-base font-bold text-slate-900">{d.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="scroll-mt-24">
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />
          <div className="mt-8 max-w-3xl divide-y divide-slate-200 border-y border-slate-200">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-slate-900">
                  {f.q}
                  <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M10 4v12M4 10h12" strokeLinecap="round" />
                  </svg>
                </summary>
                <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-200/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row sm:px-10">
          <Logo />
          <p className="text-sm text-slate-500">A CSE309 course project. Nothing said here is stored.</p>
        </div>
      </footer>
    </div>
  )
}
