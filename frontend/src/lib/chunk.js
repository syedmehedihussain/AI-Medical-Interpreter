/**
 * Split a spoken passage into translation-sized pieces on sentence boundaries.
 *
 * The mic records a whole utterance before translating (see App.jsx), so a long
 * passage can exceed the backend's 500-character limit (schema.md 5.4). Rather
 * than truncate or cut mid-word, this breaks the text on sentence terminators
 * and greedily packs whole sentences into pieces of at most `maxLen` characters.
 * Splitting on sentences keeps each piece coherent, so the translation quality
 * that motivated buffering in the first place is preserved.
 *
 * The English terminators are `.?!`; the Bengali sentence terminator is the
 * danda `।`. Newlines count too. Order and content are preserved: joining the
 * returned pieces with a single space reproduces the whitespace-normalised text.
 */

const SENTENCE_RE = /[^.?!।\n]+[.?!।\n]*/g

/**
 * Hard-split a single over-long sentence on word boundaries.
 *
 * Reached only when one sentence has no terminator and is longer than maxLen.
 * Packs words up to the limit; a single word longer than maxLen (rare, e.g. a
 * URL) is sliced so no piece can ever exceed the backend bound.
 */
function splitLongSentence(sentence, maxLen) {
  const pieces = []
  let current = ''
  for (const word of sentence.split(/\s+/)) {
    if (!word) continue
    if (word.length > maxLen) {
      // Flush what we have, then slice the giant word into maxLen chunks.
      if (current) {
        pieces.push(current)
        current = ''
      }
      for (let i = 0; i < word.length; i += maxLen) {
        pieces.push(word.slice(i, i + maxLen))
      }
      continue
    }
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxLen) {
      pieces.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) pieces.push(current)
  return pieces
}

/**
 * @param {string} text   The full passage to chunk.
 * @param {number} maxLen Maximum characters per piece (default 500, the backend cap).
 * @returns {string[]}    Pieces each <= maxLen, in order, empties dropped.
 */
export function chunkBySentence(text, maxLen = 500) {
  const normalised = (text ?? '').trim()
  if (!normalised) return []
  if (normalised.length <= maxLen) return [normalised]

  const sentences = normalised.match(SENTENCE_RE) ?? [normalised]
  const chunks = []
  let current = ''

  for (const raw of sentences) {
    const sentence = raw.trim()
    if (!sentence) continue

    if (sentence.length > maxLen) {
      // This sentence alone exceeds the limit: flush the current chunk, then
      // break the sentence down on word boundaries.
      if (current) {
        chunks.push(current)
        current = ''
      }
      chunks.push(...splitLongSentence(sentence, maxLen))
      continue
    }

    const candidate = current ? `${current} ${sentence}` : sentence
    if (candidate.length > maxLen) {
      chunks.push(current)
      current = sentence
    } else {
      current = candidate
    }
  }

  if (current) chunks.push(current)
  return chunks
}
