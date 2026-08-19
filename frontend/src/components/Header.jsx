import StatusDot from './StatusDot'

/** App header: the name, and the engine status (prd.md section 2). */
export default function Header({ status }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <h1 className="text-lg font-semibold tracking-tight text-slate-900">AI Medical Interpreter</h1>
      <StatusDot status={status} />
    </header>
  )
}
