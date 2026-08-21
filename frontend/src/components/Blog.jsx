import PageHeader from './PageHeader'
import { Reveal, Stagger, StaggerItem } from './motion'

const STATS = [
  { n: '49.1%', l: 'of adverse events for limited-English-proficient patients involved physical harm — versus 29.5% for English speakers.' },
  { n: '~25M', l: 'people in the U.S. alone speak English less than “very well” — 8.6% of the population, and a fraction of the global figure.' },
  { n: '#1', l: 'Communication is the most frequent root cause of serious adverse events reported to the Joint Commission’s Sentinel Event Database.' },
]

const SOURCES = [
  { label: 'Divi et al., “Language proficiency and adverse events in US hospitals” (Commonwealth Fund, 2007)', href: 'https://www.commonwealthfund.org/publications/journal-article/2007/apr/language-proficiency-and-adverse-events-us-hospitals-pilot' },
  { label: 'AHRQ — Improving Patient Safety Systems for Patients With Limited English Proficiency', href: 'https://www.ahrq.gov/health-literacy/professional-training/lepguide/index.html' },
  { label: 'The Joint Commission — Quick Safety 13: caring for LEP patients', href: 'https://www.jointcommission.org/resources/news-and-multimedia/newsletters/newsletters/quick-safety/quick-safety--issue-13-overcoming-the-challenges-of-providing-care-to-lep-patients/' },
  { label: '“It’s the difference between life and death” — professional medical interpreters (PMC)', href: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5628836/' },
  { label: 'Effectiveness of interpreters and other strategies: a systematic review (2025)', href: 'https://pubmed.ncbi.nlm.nih.gov/40179546/' },
]

function Para({ children }) {
  return <p className="mt-4 text-[16px] leading-[1.75] text-slate-700">{children}</p>
}

function H2({ children }) {
  return <h2 className="mt-12 text-2xl font-extrabold tracking-tight text-slate-900">{children}</h2>
}

export default function Blog({ onHome, onBack, onGetStarted }) {
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader onHome={onHome} onBack={onBack} />
      <article className="mx-auto max-w-2xl px-6 pb-20 pt-4 sm:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Blog</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            When care gets lost in translation
          </h1>
          <p className="mt-4 text-[13px] font-medium uppercase tracking-wide text-slate-400">
            Language barriers in healthcare · 6 min read
          </p>
          <Para>
            A patient arrives in pain and can only describe it in Bangla. The doctor speaks English. In that gap — before
            any interpreter arrives — decisions still get made: about symptoms, allergies, doses. The gap itself is a
            clinical risk, and the evidence on how much is sobering.
          </Para>
        </Reveal>

        <Stagger className="mt-10 grid gap-4 sm:grid-cols-3">
          {STATS.map((s) => (
            <StaggerItem key={s.n} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-3xl font-extrabold text-brand-700">{s.n}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{s.l}</p>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal>
          <H2>The barrier is everywhere</H2>
          <Para>
            Limited English proficiency is usually framed as an American statistic, but the underlying problem is
            universal: any time a patient and clinician don’t share a fluent language, care has to route around the gap.
            In the U.S., roughly <a className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-500" href={SOURCES[1].href} target="_blank" rel="noreferrer noopener">25 million people</a>{' '}
            speak English less than “very well.” In a Bangladeshi clinic the axis is different but the shape is the same —
            and it isn’t only English versus Bangla. Regional varieties like Sylheti and Chatgaiya can leave even a
            Bangla-speaking clinician guessing.
          </Para>
        </Reveal>

        <Reveal>
          <H2>The cost isn’t abstract</H2>
          <Para>
            When a language barrier is present, harm is both more likely and more severe. In a landmark pilot study,{' '}
            <a className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-500" href={SOURCES[0].href} target="_blank" rel="noreferrer noopener">adverse events for LEP patients</a>{' '}
            resulted in physical harm 49.1% of the time, against 29.5% for English-speaking patients. Communication
            failures are the <a className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-500" href={SOURCES[2].href} target="_blank" rel="noreferrer noopener">single most common root cause</a>{' '}
            of serious adverse events. Downstream, patients who don’t get a qualified interpreter tend to stay longer and
            face higher rates of surgical infections, falls, and readmissions.
          </Para>
        </Reveal>

        <Reveal>
          <H2>What actually helps</H2>
          <Para>
            The evidence is consistent: <a className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-500" href={SOURCES[4].href} target="_blank" rel="noreferrer noopener">professional interpretation improves outcomes</a>{' '}
            — better comprehension, more questions asked, stronger shared decisions, higher satisfaction, and fewer
            errors. In-person and video interpreting outperform telephone; a clinician who speaks the patient’s own
            language, backed by a professional interpreter, does best of all. The through-line is simple: the more
            faithfully the words cross, the safer the care.
          </Para>
        </Reveal>

        <Reveal>
          <H2>The gap that remains</H2>
          <Para>
            Professional interpreters are the gold standard — and they are scarce, costly, and rarely instant. A
            certified interpreter for a specific dialect, available the moment a patient walks in at 2 a.m., is the
            exception, not the rule. That delay is exactly where care improvises, and where the risks above concentrate.
          </Para>
        </Reveal>

        <Reveal>
          <H2>Where a tool like this fits — and where it doesn’t</H2>
          <Para>
            A real-time interpreter can’t replace a certified human in a high-stakes or legal setting, and it shouldn’t
            pretend to. What it can do is close the first, most dangerous gap: the minutes before anyone else arrives. It
            keeps drug names and dosages exact, plays the translation back aloud, and asks a human to confirm every
            medication before it’s recorded. It only translates — it never infers a diagnosis. Those limits are the
            point: an honest tool that makes the conversation possible, and leaves the judgement to the clinician.
          </Para>
        </Reveal>

        <Reveal className="mt-14 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Sources</h3>
          <ul className="mt-3 space-y-2">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer noopener" className="text-[13.5px] leading-relaxed text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-500">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-12 text-center">
          <button
            type="button"
            onClick={onGetStarted}
            className="group inline-flex items-center gap-2 rounded-full bg-brand-700 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-700/25 transition hover:bg-brand-800 hover:-translate-y-0.5"
          >
            Try the interpreter
            <svg viewBox="0 0 20 20" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 10h12m0 0-5-5m5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </Reveal>
      </article>
    </div>
  )
}
