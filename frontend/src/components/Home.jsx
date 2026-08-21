import { useEffect, useRef, useState } from 'react'
import AccountMenu from './AccountMenu'
import { Reveal, Stagger, StaggerItem } from './motion'

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
    a: 'Only if you choose to. In the demo, nothing is saved. With an account, you can save a consultation report yourself; audio is never stored either way.',
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
  { id: 'blog', label: 'Blog', hint: 'Language barriers in care' },
  { id: 'about', label: 'About', hint: 'Who built this' },
  { id: 'howwebuilt', label: 'How we built it', hint: 'The build, end to end' },
]

// Honest capability pills for the moving trust strip -- no fabricated clients.
const MARQUEE_ITEMS = [
  'Real-time, both ways',
  'English ⇄ বাংলা',
  'Speak or type',
  'Drug names preserved',
  'Dosages kept exact',
  'Play the translation aloud',
  'Confirm before routing',
  'Nothing saved in demo',
  'Works in Chrome & Edge',
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

function ResourceMenu({ onSelect }) {
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
              onClick={() => {
                setOpen(false)
                onSelect?.(r.id)
              }}
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

function Header({
  onGetStarted,
  authConfigured,
  accountName,
  accountEmail,
  onOpenAuth,
  onLogout,
  onOpenReports,
  onOpenProfile,
  onOpenSettings,
  onOpenHelp,
  onOpenResource,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 sm:px-10">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          <a href="#use-cases" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">Use cases</a>
          <a href="#docs" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">Docs</a>
          <button type="button" onClick={onOpenHelp} className="text-sm font-medium text-slate-600 transition hover:text-slate-900">Help</button>
          <ResourceMenu onSelect={onOpenResource} />
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {authConfigured && (
            accountEmail ? (
              <AccountMenu
                name={accountName}
                email={accountEmail}
                onProfile={onOpenProfile}
                onSettings={onOpenSettings}
                onReports={onOpenReports}
                onLogout={onLogout}
              />
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Log in
              </button>
            )
          )}
          <button
            type="button"
            onClick={onGetStarted}
            className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-700/20 transition hover:bg-brand-800 hover:-translate-y-0.5 active:translate-y-0"
          >
            Get started
          </button>
        </div>
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

function TrustMarquee() {
  const row = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]
  return (
    <div className="border-y border-slate-200/70 bg-white/50 py-5">
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Designed for the bedside
      </p>
      <div className="marquee-mask overflow-hidden">
        <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
          {row.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
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

export default function Home({
  onGetStarted,
  authConfigured,
  accountName,
  accountEmail,
  onOpenAuth,
  onLogout,
  onOpenReports,
  onOpenProfile,
  onOpenSettings,
  onOpenHelp,
  onOpenResource,
}) {
  return (
    <div className="relative min-h-screen">
      <Header
        onGetStarted={onGetStarted}
        authConfigured={authConfigured}
        accountName={accountName}
        accountEmail={accountEmail}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
        onOpenReports={onOpenReports}
        onOpenProfile={onOpenProfile}
        onOpenSettings={onOpenSettings}
        onOpenHelp={onOpenHelp}
        onOpenResource={onOpenResource}
      />

      <div className="grain relative overflow-hidden">
        <div
          aria-hidden="true"
          className="blob animate-float pointer-events-none absolute -right-24 -top-24 h-72 w-72 bg-brand-300/50 sm:h-[26rem] sm:w-[26rem] lg:-right-16 lg:h-[34rem] lg:w-[34rem]"
        />

        <div className="relative mx-auto max-w-6xl px-6 sm:px-10">
          <main className="flex flex-col justify-center py-16 sm:py-24">
            <Stagger className="max-w-3xl" stagger={0.1} amount={0.1}>
              <StaggerItem
                as="p"
                className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-brand-700"
              >
                Real-time medical interpreter
              </StaggerItem>
              <StaggerItem
                as="h1"
                className="text-display text-5xl font-extrabold text-slate-900 sm:text-6xl lg:text-7xl"
              >
                Care shouldn&rsquo;t get
                <br />
                lost in <span className="text-brand-600">translation.</span>
              </StaggerItem>
              <StaggerItem
                as="p"
                className="mt-7 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl"
              >
                Speech-to-speech interpretation between a doctor and patient, in the moment.
                Bridge English and Bangla at the bedside without waiting on an interpreter to arrive.
              </StaggerItem>

              <StaggerItem className="mt-10 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="group inline-flex items-center gap-3 rounded-full bg-brand-700 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-brand-700/25 transition hover:bg-brand-800 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Get started
                  <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14m0 0-6-6m6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="text-sm text-slate-500">Free to try, no sign-up for the demo. Chrome or Edge.</span>
              </StaggerItem>

              <StaggerItem className="mt-10 flex flex-wrap gap-3">
                <TrustChip accent>Live, in real time</TrustChip>
                <TrustChip>Audio never stored</TrustChip>
                <TrustChip>Speak or type</TrustChip>
              </StaggerItem>
            </Stagger>

            <Stagger className="mt-20 grid gap-10 border-t border-slate-200/80 pt-12 sm:grid-cols-3 sm:gap-8">
              {FEATURES.map((f) => (
                <StaggerItem key={f.n}>
                  <span className="font-mono text-sm font-semibold text-brand-500">{f.n}</span>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{f.body}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </main>
        </div>
      </div>

      <TrustMarquee />

      <div className="mx-auto max-w-6xl space-y-24 px-6 pb-28 pt-24 sm:px-10">
        <section id="use-cases" className="scroll-mt-24">
          <Reveal>
            <SectionHeading eyebrow="Use cases" title="Built for the moments that can't wait">
              Where a language gap slows care down, the interpreter keeps the conversation moving.
            </SectionHeading>
          </Reveal>
          <Stagger className="mt-10 grid gap-5 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <StaggerItem
                key={u.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg hover:shadow-slate-900/[0.05]"
              >
                <h3 className="text-lg font-bold text-slate-900">{u.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{u.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section id="docs" className="scroll-mt-24">
          <Reveal>
            <SectionHeading eyebrow="Docs" title="How it works, in four steps">
              Try it free with the demo, or make an account to save your consultation reports.
            </SectionHeading>
          </Reveal>
          <Stagger className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {DOCS.map((d) => (
              <StaggerItem key={d.step}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 font-mono text-sm font-bold text-brand-700">
                  {d.step}
                </span>
                <h3 className="mt-3 text-base font-bold text-slate-900">{d.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{d.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section id="faq" className="scroll-mt-24">
          <Reveal>
            <SectionHeading eyebrow="FAQ" title="Questions, answered" />
          </Reveal>
          <Reveal delay={0.05} className="mt-8 max-w-3xl divide-y divide-slate-200 border-y border-slate-200">
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
          </Reveal>
        </section>

        <Reveal className="overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-10 text-center sm:p-14">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Ready when the next patient is.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600">
            Start a live consultation now. Try the demo without an account, or sign up to save your reports.
          </p>
          <button
            type="button"
            onClick={onGetStarted}
            className="group mt-8 inline-flex items-center gap-3 rounded-full bg-brand-700 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-brand-700/25 transition hover:bg-brand-800 hover:-translate-y-0.5 active:translate-y-0"
          >
            Get started
            <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14m0 0-6-6m6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </Reveal>
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
