import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useReduceMotion } from './motion'

// The two languages a role can speak, in display order.
const LANGS = [
  ['en', 'English'],
  ['bn', 'বাংলা'],
]

const TIPS = [
  { title: 'Tap a role to switch speaker', body: 'The active role’s language is the source; tapping the other role flips the direction instantly.' },
  { title: 'Speak or type', body: 'Hold the mic and talk, or type a sentence. Both go through the same interpreter.' },
  { title: 'Confirm before it counts', body: 'Detected medications and specialties are yours to confirm — nothing is assumed.' },
]

function RoleCard({ active, name, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 rounded-2xl border p-5 text-left transition ${
        active ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="mt-3 text-base font-bold text-slate-900">{name}</p>
      <p className="mt-0.5 text-[13px] text-slate-500">{sub}</p>
    </button>
  )
}

function LangPicker({ label, value, onChange }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <div className="flex gap-2">
        {LANGS.map(([code, name]) => (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-pressed={value === code}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
              value === code ? 'border-brand-500 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Onboarding({
  doctorLang,
  patientLang,
  activeSpeaker,
  onSpeakerChange,
  onDoctorLangChange,
  onPatientLangChange,
  onDone,
}) {
  const [step, setStep] = useState(0)
  const reduce = useReduceMotion()
  const total = 3

  const next = () => setStep((s) => Math.min(s + 1, total - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))

  const variants = reduce
    ? {}
    : {
        enter: { opacity: 0, x: 24 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
      }

  const steps = [
    (
      <div key="who">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">Who are you, mostly?</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-500">
          We’ll open each session with you as the active speaker. You can switch any time.
        </p>
        <div className="mt-6 flex gap-3">
          <RoleCard active={activeSpeaker === 'doctor'} name="Doctor" sub="You lead the consultation" onClick={() => onSpeakerChange('doctor')} />
          <RoleCard active={activeSpeaker === 'patient'} name="Patient" sub="You’re the one being seen" onClick={() => onSpeakerChange('patient')} />
        </div>
      </div>
    ),
    (
      <div key="langs">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">Set your languages</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-500">
          Each role speaks one language; the interpreter renders the other. They’re kept different automatically.
        </p>
        <div className="mt-6 space-y-4">
          <LangPicker label="Doctor speaks" value={doctorLang} onChange={onDoctorLangChange} />
          <LangPicker label="Patient speaks" value={patientLang} onChange={onPatientLangChange} />
        </div>
      </div>
    ),
    (
      <div key="how">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">How it works</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-500">Three things and you’re ready.</p>
        <ul className="mt-6 space-y-4">
          {TIPS.map((t, i) => (
            <li key={t.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 font-mono text-xs font-bold text-brand-700">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{t.title}</p>
                <p className="mt-0.5 text-[14px] leading-relaxed text-slate-600">{t.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ),
  ]

  return (
    <div className="grain relative flex min-h-[100dvh] flex-col overflow-hidden bg-canvas">
      <div
        aria-hidden="true"
        className="blob animate-float pointer-events-none absolute -left-24 -top-24 h-72 w-72 bg-brand-300/40 sm:h-[26rem] sm:w-[26rem]"
      />

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-brand-600' : i < step ? 'w-4 bg-brand-300' : 'w-4 bg-slate-200'}`}
              />
            ))}
          </div>
          <button type="button" onClick={onDone} className="text-sm font-medium text-slate-400 transition hover:text-slate-700">
            Skip
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/[0.06] sm:p-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Welcome to AI Medical Interpreter
          </p>
          <div className="relative min-h-[280px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {steps[step]}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-0"
            >
              Back
            </button>
            {step < total - 1 ? (
              <button
                type="button"
                onClick={next}
                className="group inline-flex items-center gap-2 rounded-full bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Continue
                <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 10h12m0 0-5-5m5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={onDone}
                className="group inline-flex items-center gap-2 rounded-full bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Enter the interpreter
                <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 10h12m0 0-5-5m5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
