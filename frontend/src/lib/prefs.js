/**
 * Small localStorage preferences that live outside the interpreter's own state.
 *
 * Role languages and autoplay are owned by App (keys ami.roles / ami.autoplay);
 * this module covers the rest: whether the user has seen onboarding, and a
 * manual "reduce motion" override layered on top of the OS setting. Every read
 * is defended so a hand-edited or absent value can never crash a render.
 */

const ONBOARDED_KEY = 'ami.onboardedAt'
const REDUCE_MOTION_KEY = 'ami.reduceMotion'

export function hasOnboarded() {
  try {
    return Boolean(localStorage.getItem(ONBOARDED_KEY))
  } catch {
    return false
  }
}

export function markOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, new Date().toISOString())
  } catch {
    // Private-mode storage failure is non-fatal; onboarding just shows again.
  }
}

export function loadReduceMotion() {
  try {
    return localStorage.getItem(REDUCE_MOTION_KEY) === 'true'
  } catch {
    return false
  }
}

export function saveReduceMotion(on) {
  try {
    localStorage.setItem(REDUCE_MOTION_KEY, String(Boolean(on)))
  } catch {
    // Ignore: the toggle simply won't persist.
  }
}
