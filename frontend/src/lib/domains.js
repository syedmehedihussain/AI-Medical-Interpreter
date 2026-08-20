// Client-side domain hinting: a transparent keyword match over the latest
// utterance, surfaced for the clinician to confirm. Not a diagnosis or a model.

export const DOMAINS = [
  { id: 'cardiology', name: 'Cardiology', keywords: ['heart', 'palpitation', 'chest pain', 'blood pressure', 'hypertension', 'pulse'] },
  { id: 'neurology', name: 'Neurology', keywords: ['headache', 'migraine', 'seizure', 'numb', 'dizzy', 'stroke', 'memory'] },
  { id: 'pulmonology', name: 'Pulmonology', keywords: ['breath', 'breathing', 'cough', 'lung', 'asthma', 'wheeze', 'chest'] },
  { id: 'general', name: 'General', keywords: ['fever', 'pain', 'tired', 'cold', 'nausea', 'checkup', 'check-up'] },
  { id: 'orthopedics', name: 'Orthopedics', keywords: ['bone', 'fracture', 'joint', 'knee', 'back pain', 'shoulder', 'sprain'] },
  { id: 'ophthalmology', name: 'Ophthalmology', keywords: ['eye', 'vision', 'blurry', 'blurred', 'sight', 'tears'] },
]

// Returns { id, confidence } for the strongest match, or null if none match.
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

  const confidence = Math.min(96, 78 + best.hits * 9)
  return { id: best.id, confidence }
}
