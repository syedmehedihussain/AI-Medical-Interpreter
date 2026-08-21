import PageHeader from './PageHeader'
import { Reveal, Stagger, StaggerItem } from './motion'

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/syedmehedihussain', sub: '@syedmehedihussain' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/syedmehedihussain/', sub: 'in/syedmehedihussain' },
  { label: 'Website', href: 'https://syedmehedihussain.codes', sub: 'syedmehedihussain.codes' },
]

const STACK = ['Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'React', 'Tailwind', 'Node.js', 'PostgreSQL', 'Docker', 'Linux']

export default function About({ onHome, onBack }) {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader onHome={onHome} onBack={onBack} />
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-4 sm:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">About</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-slate-900 sm:text-5xl">Syed Mehedi Hussain</h1>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-slate-600">
            Developer in Dhaka working across AI, security, systems and Linux. I’d rather my homepage be something you SSH into.
          </p>
        </Reveal>

        <Stagger className="mt-7 flex flex-wrap gap-3">
          {LINKS.map((l) => (
            <StaggerItem
              key={l.label}
              as="a"
              href={l.href}
              target="_blank"
              rel="noreferrer noopener"
              className="group inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700"
            >
              {l.label}
              <span className="font-mono text-xs font-normal text-slate-400 group-hover:text-brand-500">{l.sub}</span>
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-brand-500" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M7 13l6-6m0 0H8m5 0v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="mt-12 space-y-5">
          <Reveal>
            <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7">
              <h2 className="text-lg font-bold text-slate-900">How I work</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
                I treat being a multipotentialite as a feature, not a bug — most of what I build sits at the
                intersection of AI, security, systems and Linux. I install things just to see how they break, write up
                the fix so it doesn’t bite twice, and plan before I build. AI is a power tool for speed and leverage, not
                a replacement for understanding what I ship.
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section className="overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-7">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">Related project</span>
              </div>
              <h2 className="mt-3 text-xl font-bold text-slate-900">MedVault</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                MedVault turns scattered paper into a living health record — reducing repeated tests, improving
                decisions, and putting people in control of their own medical history. It’s the companion to this
                interpreter: a consultation here produces a prescription report; MedVault is where a patient’s records
                can live.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="https://med-vault-orpin.vercel.app/welcome"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 hover:-translate-y-0.5"
                >
                  Live demo
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M7 13l6-6m0 0H8m5 0v5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a
                  href="https://github.com/syedmehedihussain/MedVault"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  View on GitHub
                </a>
              </div>
            </section>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2">
            <Reveal>
              <section className="h-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-7">
                <h2 className="text-lg font-bold text-slate-900">Education & work</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
                  B.Sc. in Computer Science at Independent University, Bangladesh (Dhaka), 2023–present. Freelance web
                  developer since 2024, building and maintaining systems for small businesses.
                </p>
                <p className="mt-3 text-[13px] text-slate-400">
                  This project is coursework for CSE309 at IUB.
                </p>
              </section>
            </Reveal>
            <Reveal>
              <section className="h-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-7">
                <h2 className="text-lg font-bold text-slate-900">Tools I reach for</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {STACK.map((t) => (
                    <span key={t} className="rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-medium text-slate-600">
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  )
}
