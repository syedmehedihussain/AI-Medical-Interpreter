import PageHeader from './PageHeader'
import { Reveal, Stagger, StaggerItem } from './motion'

// Curated from the project's live progress dashboard (Work Log + Decisions).
// Update alongside the dashboard as the build moves on.
const MILESTONES = [
  {
    tag: 'The skeleton',
    title: 'Voice in → text → translate → voice out',
    body: 'It started as a walking skeleton: one screen, no database, no accounts. Speech recognition in the browser, a keyless free translation endpoint, and speech played back in the other language. Enough to prove the whole path end to end before polishing any of it.',
  },
  {
    tag: 'The seam',
    title: 'One interface, five engines',
    body: 'Translation was put behind a provider seam — stub, MyMemory, keyless Google, Google Cloud, and Gemini — all behind a single interface. Swapping the engine became an environment variable, not a rewrite. That decision paid for itself every time after.',
  },
  {
    tag: 'The medical brain',
    title: 'Gemini, tuned for the clinic',
    body: 'A medical-tuned Gemini provider (Google AI Studio) became the default: it keeps drug names, dosages and units exact instead of paraphrasing them. The same model powers the doctor’s AI consultation summary and per-turn medication extraction — constrained to only use what was actually said.',
  },
  {
    tag: 'Our own model, locally',
    title: 'A self-hosted speech-to-speech pipeline',
    body: 'Alongside the cloud, we integrated our own pipeline running on the machine — NLLB for translation, Whisper for speech recognition, and MMS-TTS for the voice — wired in as another switchable provider. The same seam that made Gemini a drop-in makes our local model one too.',
  },
  {
    tag: 'Safety first',
    title: 'Nothing enters the record unconfirmed',
    body: 'Every medication the model hears pops a verification modal (name, dosage, times/day, timing) that a human confirms or discards before it is saved. The interpreter never infers a diagnosis, and any detected specialty is a hint you confirm, not a decision it makes.',
  },
  {
    tag: 'Real accounts',
    title: 'Backend-mediated auth and saved reports',
    body: 'Supabase accounts arrived without moving a single route signature — the auth seam was reserved from day one. The browser does auth; the backend verifies the JWT and owns every database write with the service role. Guests still use everything; nothing is saved unless you choose to.',
  },
  {
    tag: 'The look',
    title: 'From a tool to a product',
    body: 'A committed green editorial identity, a calm welcome → session interpreter console, and a motion pass on the marketing site — staggered reveals, scroll animations, honest content only. No fake clients, no invented metrics, no fake compliance badges.',
  },
]

const PAINS = [
  {
    title: 'The blank white page',
    body: 'After adding Supabase, the live site went blank. The Supabase client throws at import on a malformed URL — and the deployed env var was missing its https:// — which took down the whole React tree. Fix: validate the URL and degrade to guest-only instead of crashing.',
  },
  {
    title: 'Free-tier rate limits',
    body: 'Rapid Gemini calls hit the free-tier per-minute quota (HTTP 429). A three-attempt retry with backoff smooths bursts; switching to the lighter flash-lite model made calls ~1s instead of ~3.5s and dodged most limits.',
  },
  {
    title: 'A single trailing slash',
    body: 'The deployed app couldn’t reach its backend: ALLOWED_ORIGINS had a trailing slash, so it never matched the browser’s slash-less Origin and CORS blocked every request. One character, an afternoon.',
  },
]

export default function HowWeBuilt({ onHome, onBack, onGetStarted }) {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader onHome={onHome} onBack={onBack} />
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-4 sm:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">How we built it</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-slate-900 sm:text-5xl">
            From a translate key to a clinical interpreter
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">
            This didn’t arrive whole. It grew from a bare skeleton — a free translation endpoint and one screen — into a
            medical interpreter with its own local AI, real accounts, and a safety-first record. Here’s the path, pulled
            from the project’s own build log.
          </p>
        </Reveal>

        {/* Timeline */}
        <div className="relative mt-12">
          <div aria-hidden="true" className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-200 sm:left-[9px]" />
          <Stagger className="space-y-8" stagger={0.06}>
            {MILESTONES.map((m, i) => (
              <StaggerItem key={m.title} className="relative pl-8 sm:pl-10">
                <span className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-brand-500 bg-canvas sm:h-[18px] sm:w-[18px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                </span>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-600">
                  {String(i + 1).padStart(2, '0')} · {m.tag}
                </span>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{m.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{m.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <Reveal className="mt-16">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Where it hurt</h2>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">
            The honest part. A few bugs cost real hours — and each got written up so they wouldn’t twice.
          </p>
        </Reveal>
        <Stagger className="mt-6 grid gap-4 sm:grid-cols-3">
          {PAINS.map((p) => (
            <StaggerItem key={p.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">{p.body}</p>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mt-16 overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-8 text-center sm:p-10">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">See where it ended up.</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-slate-600">
            Every decision above is in service of one thing: a clearer conversation at the bedside.
          </p>
          <button
            type="button"
            onClick={onGetStarted}
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-brand-700 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-700/25 transition hover:bg-brand-800 hover:-translate-y-0.5"
          >
            Try the interpreter
            <svg viewBox="0 0 20 20" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 10h12m0 0-5-5m5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </Reveal>
      </div>
    </div>
  )
}
