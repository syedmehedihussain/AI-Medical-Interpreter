import { useState } from 'react'
import { saveReduceMotion } from '../lib/prefs'
import PageHeader from './PageHeader'
import { Reveal } from './motion'

const LANGS = [
  ['en', 'English'],
  ['bn', 'বাংলা'],
]

function Card({ title, desc, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {desc && <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-2">
      {options.map(([code, name]) => (
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
  )
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {desc && <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

export default function Settings({
  doctorLang,
  patientLang,
  activeSpeaker,
  onDoctorLangChange,
  onPatientLangChange,
  onSpeakerChange,
  autoplay,
  onAutoplayChange,
  reduceMotion,
  onReduceMotionChange,
  onHome,
  onBack,
}) {
  const [reduce, setReduce] = useState(reduceMotion)

  const toggleReduce = (on) => {
    setReduce(on)
    saveReduceMotion(on)
    onReduceMotionChange?.(on)
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <PageHeader onHome={onHome} onBack={onBack} />
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-4 sm:px-8">
        <Reveal>
          <h1 className="font-serif text-3xl font-semibold text-slate-900 sm:text-4xl">Settings</h1>
          <p className="mt-2 text-[15px] text-slate-500">Preferences apply to new sessions and are saved on this device.</p>
        </Reveal>

        <div className="mt-8 space-y-5">
          <Reveal>
            <Card title="Default languages" desc="How each role starts. The two are always kept different.">
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Doctor speaks</p>
                  <Segmented options={LANGS} value={doctorLang} onChange={onDoctorLangChange} />
                </div>
                <div>
                  <p className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Patient speaks</p>
                  <Segmented options={LANGS} value={patientLang} onChange={onPatientLangChange} />
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal>
            <Card title="Default speaker" desc="Who is active when a session opens.">
              <Segmented
                options={[['doctor', 'Doctor'], ['patient', 'Patient']]}
                value={activeSpeaker}
                onChange={onSpeakerChange}
              />
            </Card>
          </Reveal>

          <Reveal>
            <Card title="Playback & motion">
              <div className="divide-y divide-slate-100">
                <Toggle
                  label="Read translation aloud automatically"
                  desc="Speak each translation as it arrives, for hands-free use."
                  checked={autoplay}
                  onChange={onAutoplayChange}
                />
                <Toggle
                  label="Reduce motion"
                  desc="Minimise animations across the app. Applies as you move between pages."
                  checked={reduce}
                  onChange={toggleReduce}
                />
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
