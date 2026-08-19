import { STATUS_LABELS } from '../lib/messages'

/**
 * Engine status indicator -- prd.md F-7.
 *
 * prd.md section 6: status is never conveyed by colour alone. Each state gets
 * a distinct colour AND a distinct shape AND a text label, so it survives
 * colour blindness, a monochrome screen, and a glance from a metre away.
 */
const STATES = {
  ready: { dot: 'bg-brand-600', shape: 'rounded-full', pulse: false },
  // A square reads differently from a circle even at a glance or in greyscale.
  listening: { dot: 'bg-sky-600', shape: 'rounded-sm', pulse: true },
  translating: { dot: 'bg-amber-500', shape: 'rounded-sm rotate-45', pulse: true },
  // A hollow ring is unmistakable against three filled shapes.
  offline: { dot: 'bg-transparent border-2 border-slate-500', shape: 'rounded-full', pulse: false },
}

export default function StatusDot({ status }) {
  const state = STATES[status] ?? STATES.offline
  const label = STATUS_LABELS[status] ?? STATUS_LABELS.offline

  return (
    <div
      className="flex items-center gap-2"
      // Announces status changes to a screen reader without stealing focus.
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-block h-2.5 w-2.5 shrink-0 ${state.dot} ${state.shape} ${
          state.pulse ? 'animate-pulse' : ''
        }`}
        aria-hidden="true"
      />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
  )
}
