/**
 * Client-side medical-domain hinting.
 *
 * NOT a diagnosis and NOT a backend model: a transparent keyword match over the
 * latest utterance that surfaces a likely specialty for the clinician to
 * confirm before anything routes (see the DomainPanel "system note"). Kept here
 * so the vocabulary is easy to extend, and so the UI never implies the app is
 * inferring clinical meaning it cannot actually verify.
 */

export const DOMAINS = [
  { id: 'cardiology', name: 'Cardiology', keywords: ['heart', 'palpitation', 'chest pain', 'blood pressure', 'hypertension', 'pulse'] },
  { id: 'neurology', name: 'Neurology', keywords: ['headache', 'migraine', 'seizure', 'numb', 'dizzy', 'stroke', 'memory'] },
  { id: 'pulmonology', name: 'Pulmonology', keywords: ['breath', 'breathing', 'cough', 'lung', 'asthma', 'wheeze', 'chest'] },
  { id: 'general', name: 'General', keywords: ['fever', 'pain', 'tired', 'cold', 'nausea', 'checkup', 'check-up'] },
  { id: 'orthopedics', name: 'Orthopedics', keywords: ['bone', 'fracture', 'joint', 'knee', 'back pain', 'shoulder', 'sprain'] },
  { id: 'ophthalmology', name: 'Ophthalmology', keywords: ['eye', 'vision', 'blurry', 'blurred', 'sight', 'tears'] },
]

/**
 * Score the text against each domain and return the strongest hint.
 *
 * Returns `{ id, confidence }` for the best match, or null when nothing matches
 * (the panel then shows every domain as "not detected"). Confidence is a rough,
 * honest signal from hit count, not a calibrated probability.
 */
export function detectDomain(text) {
  const haystack = (text ?? '').toLowerCase()
  if (!haystack.trim()) return null

  let best = null
  for (const domain of DOMAINS) {
    const hits = domain.keywords.filter((word) => haystack.includes(word)).length
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { id: domain.id, hits }
    }
  }
  if (!best) return null

  // Two or more matching terms reads as a confident hint; one as a softer one.
  const confidence = Math.min(96, 78 + best.hits * 9)
  return { id: best.id, confidence }
}
