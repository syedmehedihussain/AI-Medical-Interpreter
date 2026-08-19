/**
 * Fixed copy -- prd.md section 7.
 *
 * Every user-visible string lives here so the wording stays consistent and can
 * be checked against the spec in one place. Errors state what happened and
 * what to do. They do not apologise.
 */

export const COPY = {
  idleButton: 'Start listening',
  activeButton: 'Stop listening',
  manualDisclosure: 'or type instead',
  manualSubmit: 'Translate',
  outputPlaceholder: 'Translation will appear here',
  transcriptEmpty:
    'Nothing yet. Start listening or type a sentence to begin. Session history clears when you refresh.',
  micDenied:
    "AI Medical Interpreter needs microphone access to hear speech. Enable it in your browser's site settings, then try again.",
  unsupportedBrowser:
    "Voice input isn't available in this browser. Use Chrome or Edge, or type your text below.",
  offline: "Can't reach the translation service. Check your connection.",
  timeout: 'That took too long. Try again.',
  genericFailure: 'Translation failed. Try again.',
  clearConfirm: "Clear this session's transcript? It can't be recovered.",
}

/** Status labels for the header indicator (prd.md F-7). */
export const STATUS_LABELS = {
  ready: 'Ready',
  listening: 'Listening',
  translating: 'Translating',
  offline: 'Offline',
}

/**
 * Map a backend error code to the message shown to the user.
 *
 * The backend already sends a display-safe `message`, but going through this
 * table means the wording is the spec's rather than whatever the server said,
 * and an unrecognised code still produces something sensible.
 */
const BY_CODE = {
  NETWORK_ERROR: COPY.offline,
  TIMEOUT: COPY.timeout,
  PROVIDER_TIMEOUT: COPY.timeout,
  PROVIDER_UNAVAILABLE: 'Translation service unavailable.',
  PROVIDER_RATE_LIMITED: 'Too many requests right now. Wait a moment and try again.',
  EMPTY_INPUT: 'Enter some text to translate.',
  SAME_LANGUAGE: 'Choose two different languages.',
  UNSUPPORTED_LANGUAGE: "That language isn't supported yet.",
  TEXT_TOO_LONG: "That's too long to translate at once. Keep it under 500 characters.",
  VALIDATION_ERROR: "That request wasn't valid.",
  INTERNAL_ERROR: COPY.genericFailure,
}

export function messageForError(error) {
  if (!error) return null
  return BY_CODE[error.code] || error.message || COPY.genericFailure
}

/** prd.md E-19: an empty translation is a failure, not a result. */
export const EMPTY_TRANSLATION = 'No translation returned. Try rephrasing.'
