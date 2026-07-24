/**
 * Language constants -- schema.md section 1.
 *
 * Two vocabularies exist and must not be mixed:
 *   - internal codes ("en", "bn") travel in API requests and responses
 *   - BCP-47 tags ("en-US", "bn-BD") are only ever handed to browser speech APIs
 *
 * This file is the ONLY place in the frontend where a string like "en-US" may
 * appear. Everything else uses "en" and "bn". Keeping the mapping at one edge
 * is what lets the backend enable a dialect without the frontend caring.
 */

export const LANGUAGES = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    speechLang: 'en-US',
    // Ordered fallback list for speech synthesis; the first available wins.
    ttsLangs: ['en-US', 'en-GB', 'en'],
    isBengali: false,
  },
  {
    code: 'bn',
    label: 'Bangla',
    nativeLabel: 'বাংলা',
    speechLang: 'bn-BD',
    // bn-BD first, then bn-IN, then bare bn (schema.md section 1). Bangla TTS
    // availability is inconsistent across operating systems (scope.md 7).
    ttsLangs: ['bn-BD', 'bn-IN', 'bn'],
    isBengali: true,
  },
]

export const DEFAULT_SOURCE = 'en'
export const DEFAULT_TARGET = 'bn'

/** Look up a language by internal code. Returns undefined if not enabled. */
export function getLanguage(code) {
  return LANGUAGES.find((lang) => lang.code === code)
}

/**
 * The other language in the pair.
 *
 * v0.1 has exactly two languages, so "the other one" is well defined. This is
 * what makes picking a language on one side auto-swap the other (prd.md F-1),
 * so the two can never be the same.
 */
export function getOther(code) {
  const other = LANGUAGES.find((lang) => lang.code !== code)
  return other ? other.code : DEFAULT_TARGET
}

/** Display name: native for Bangla, plain label for English (prd.md F-1). */
export function getDisplayLabel(code) {
  const lang = getLanguage(code)
  if (!lang) return code
  return lang.isBengali ? lang.nativeLabel : lang.label
}

/** True when text in this language should use the Bengali face and size. */
export function isBengali(code) {
  return Boolean(getLanguage(code)?.isBengali)
}
