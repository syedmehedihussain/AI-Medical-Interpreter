import { useCallback, useEffect, useRef, useState } from 'react'
import { extractMedications, getHealth, saveReport, summarize } from './api/client'
import AuthModal from './components/AuthModal'
import Home from './components/Home'
import MyReports from './components/MyReports'
import Studio from './components/Studio'
import { useAuth } from './hooks/useAuth'
import { useSpeak } from './hooks/useSpeak'
import { useSpeech } from './hooks/useSpeech'
import { useTranslate } from './hooks/useTranslate'
import { chunkBySentence } from './lib/chunk'
import { getDisplayLabel } from './lib/languages'
import { buildPrescriptionHTML, openPrintWindow } from './lib/report'
import { DEFAULT_SOURCE, DEFAULT_TARGET, getLanguage, getOther } from './lib/languages'

const ROLES_KEY = 'ami.roles'
const AUTOPLAY_KEY = 'ami.autoplay'

// Who speaks which language by default: the doctor in English, the patient in
// Bangla. Either can be changed to the other language; the two must always
// differ, since a translation needs two languages.
const DEFAULT_DOCTOR_LANG = DEFAULT_SOURCE // 'en'
const DEFAULT_PATIENT_LANG = DEFAULT_TARGET // 'bn'

// prd.md E-11: the backend rejects text longer than this. A recorded passage is
// split into pieces of at most this many characters on sentence boundaries
// before sending (chunkBySentence), so a long monologue is never truncated.
const MAX_SEGMENT_LENGTH = 500

/**
 * Read the saved role setup, defending against anything unusable in storage.
 *
 * Storage is user-writable and outlives code changes, so a value written by an
 * older build, or edited by hand, must not be able to crash the app on load.
 * The patient language is always re-derived to differ from the doctor's, so a
 * same-language pair (unreachable through the UI, but trivially hand-written)
 * cannot take effect.
 */
function loadRoles() {
  const fallback = {
    doctorLang: DEFAULT_DOCTOR_LANG,
    patientLang: DEFAULT_PATIENT_LANG,
    activeSpeaker: 'doctor',
  }
  try {
    const raw = localStorage.getItem(ROLES_KEY)
    if (!raw) return fallback
    const saved = JSON.parse(raw)
    const doctorLang = getLanguage(saved?.doctorLang) ? saved.doctorLang : DEFAULT_DOCTOR_LANG
    const activeSpeaker = saved?.activeSpeaker === 'patient' ? 'patient' : 'doctor'
    return { doctorLang, patientLang: getOther(doctorLang), activeSpeaker }
  } catch {
    return fallback
  }
}

/**
 * Map transcript entries to English-side turns for the summary/report.
 *
 * `speaker` is the role recorded on the entry (who was talking); the text is
 * always the English side -- the English utterance itself, or the English
 * translation of the other language -- so the doctor's note reads in one
 * language regardless of which language each role is set to.
 */
function entriesToTurns(entries) {
  return entries.map((entry) => ({
    speaker: entry.speaker === 'patient' ? 'patient' : 'doctor',
    text: entry.sourceLang === 'en' ? entry.sourceText : entry.translatedText,
  }))
}

function loadAutoplay() {
  try {
    // prd.md F-4: on by default, since the clinical case is hands-free.
    return localStorage.getItem(AUTOPLAY_KEY) !== 'false'
  } catch {
    return true
  }
}

export default function App() {
  // Two views, no router: the marketing home and the interpreter tool.
  const [view, setView] = useState('home')
  // Role-based language setup. Each role has a language; the active speaker's
  // language is the source, the other role's is the target. So switching who is
  // speaking flips the translation direction.
  const [{ doctorLang, patientLang, activeSpeaker }, setRoles] = useState(loadRoles)
  const sourceLang = activeSpeaker === 'doctor' ? doctorLang : patientLang
  const targetLang = activeSpeaker === 'doctor' ? patientLang : doctorLang
  const [backendReachable, setBackendReachable] = useState(null)
  const [autoplay] = useState(loadAutoplay)
  const [entries, setEntries] = useState([])
  const [lastFinalText, setLastFinalText] = useState('')
  // The utterance being translated. Cleared on success; kept on error for retry.
  const [pendingSource, setPendingSource] = useState(null)
  // Seconds the mic has been open, for the console's recording timer.
  const [listenSeconds, setListenSeconds] = useState(0)
  // The AI conversation summary: generated on demand, cached until regenerated.
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState(null)
  // Medications the doctor/patient has verified, shown in the console list.
  const [medications, setMedications] = useState([])
  // Extracted medications awaiting verification: each pops a modal in turn.
  const [verifyQueue, setVerifyQueue] = useState([])
  // A listed medication reopened for editing via the same modal, or null.
  const [editingId, setEditingId] = useState(null)
  // True while the Download report button is assembling the prescription.
  const [reportBusy, setReportBusy] = useState(false)
  // Accounts (Supabase). Guests have user=null and can use everything but save.
  const auth = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  // Feedback for the Save-to-account button: idle | saving | saved | error.
  const [saveState, setSaveState] = useState('idle')

  const { translateChunks, isLoading, error } = useTranslate()
  const speak = useSpeak({ lang: targetLang })

  const lastRequestRef = useRef(null)
  const entryCounterRef = useRef(0)
  const medCounterRef = useRef(0)

  // prd.md F-7: checked once on load, then driven by request outcomes.
  useEffect(() => {
    let cancelled = false
    getHealth()
      .then(() => !cancelled && setBackendReachable(true))
      .catch(() => !cancelled && setBackendReachable(false))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(ROLES_KEY, JSON.stringify({ doctorLang, patientLang, activeSpeaker }))
    } catch {
      // Private browsing can make setItem throw. Not worth crashing over.
    }
  }, [doctorLang, patientLang, activeSpeaker])

  useEffect(() => {
    try {
      localStorage.setItem(AUTOPLAY_KEY, String(autoplay))
    } catch {
      // As above.
    }
  }, [autoplay])

  /**
   * Extract medications from one turn's English text and merge new ones in.
   *
   * Runs after each translation, fire-and-forget: it must never disrupt the
   * conversation, so any failure (including Gemini's occasional 503) is
   * swallowed with a console warning and the list is simply left unchanged for
   * that turn. New medications are deduped by lowercased name against whatever
   * is already listed; a confident name lands 'confirmed', an unsure one
   * 'pending' so the doctor can confirm or edit it.
   */
  // Kept in sync so the dedupe inside the enqueue updater can see the current
  // confirmed list without re-creating detectMedications on every change.
  const medicationsRef = useRef([])
  useEffect(() => {
    medicationsRef.current = medications
  }, [medications])

  const detectMedications = useCallback(async (englishText) => {
    if (!englishText?.trim()) return
    let found
    try {
      const data = await extractMedications({ text: englishText })
      found = data?.medications ?? []
    } catch (err) {
      console.warn('[medications] extraction failed:', err?.code || err)
      return
    }
    if (found.length === 0) return

    // Every extracted medication is queued for verification rather than added
    // straight to the list. Skip names already queued or already confirmed so
    // the same drug mentioned twice does not pop a second time.
    setVerifyQueue((queue) => {
      const seen = new Set([
        ...queue.map((m) => m.name.trim().toLowerCase()),
        ...medicationsRef.current.map((m) => m.name.trim().toLowerCase()),
      ])
      const additions = []
      for (const med of found) {
        const name = (med.name ?? '').trim()
        const key = name.toLowerCase()
        if (!name || seen.has(key)) continue
        seen.add(key)
        medCounterRef.current += 1
        additions.push({
          id: `med-${medCounterRef.current}`,
          name,
          dosage: (med.dosage ?? '').trim(),
          timesPerDay: (med.times_per_day ?? '').trim(),
          timing: (med.timing ?? '').trim(),
          confident: Boolean(med.confident),
        })
      }
      return additions.length ? [...queue, ...additions] : queue
    })
  }, [])

  /** Add a verified (or edited) medication to the list, deduped by name. */
  const upsertMedication = useCallback((id, fields) => {
    const name = fields.name.trim()
    if (!name) return
    const next = {
      id,
      name,
      dosage: fields.dosage.trim(),
      timesPerDay: fields.timesPerDay.trim(),
      timing: fields.timing.trim(),
    }
    setMedications((previous) => {
      const idx = previous.findIndex((m) => m.id === id)
      if (idx !== -1) {
        // Editing an existing row.
        const copy = [...previous]
        copy[idx] = next
        return copy
      }
      // New row: drop it if the same name was confirmed in the meantime.
      if (previous.some((m) => m.name.trim().toLowerCase() === name.toLowerCase())) {
        return previous
      }
      return [...previous, next]
    })
  }, [])

  const removeMedication = useCallback((id) => {
    setMedications((previous) => previous.filter((m) => m.id !== id))
    setEditingId((current) => (current === id ? null : current))
  }, [])

  const startEditMedication = useCallback((id) => setEditingId(id), [])

  // The modal shows an edit of a listed med if one is open, otherwise the head
  // of the verification queue. Editing (user-initiated) takes priority.
  const editingMed = editingId ? medications.find((m) => m.id === editingId) : null
  const medicationModal = editingMed
    ? { mode: 'edit', med: editingMed }
    : verifyQueue.length
      ? { mode: 'verify', med: verifyQueue[0] }
      : null

  const confirmMedicationModal = useCallback(
    (fields) => {
      if (editingId) {
        upsertMedication(editingId, fields)
        setEditingId(null)
        return
      }
      const head = verifyQueue[0]
      if (head) {
        upsertMedication(head.id, fields)
        setVerifyQueue((queue) => queue.filter((m) => m.id !== head.id))
      }
    },
    [editingId, verifyQueue, upsertMedication],
  )

  const dismissMedicationModal = useCallback(() => {
    if (editingId) {
      setEditingId(null)
      return
    }
    const head = verifyQueue[0]
    if (head) setVerifyQueue((queue) => queue.filter((m) => m.id !== head.id))
  }, [editingId, verifyQueue])

  /**
   * The single translation entry point, shared by voice and typing.
   *
   * prd.md F-5 is explicit that manual entry is not a separate code path. The
   * only difference is inputMode, recorded on the transcript entry.
   */
  const runTranslation = useCallback(
    async (rawText, { inputMode = 'typed' } = {}) => {
      const text = rawText.trim()
      if (!text) return null

      // The role speaking now; recorded on the entry so the transcript labels
      // Doctor/Patient by who spoke, not by which language it happened to be.
      const speaker = activeSpeaker
      lastRequestRef.current = { text, inputMode }
      // Show the sent turn immediately, before the network answers.
      setPendingSource({ text, inputMode, sourceLang, targetLang })
      // A recorded passage may be longer than the backend's limit; split it on
      // sentence boundaries and translate the pieces as one exchange. Typed
      // input is already capped at MAX_SEGMENT_LENGTH, so it stays one chunk.
      const chunks = chunkBySentence(text, MAX_SEGMENT_LENGTH)
      const data = await translateChunks(chunks, { sourceLang, targetLang })
      if (!data) return null

      setBackendReachable(true)

      // Field names match schema.md section 3 so these serialise straight into
      // transcript rows when persistence arrives in v0.2.
      entryCounterRef.current += 1
      setEntries((previous) => [
        ...previous,
        {
          id: `${Date.now()}-${entryCounterRef.current}`,
          sourceText: data.source_text,
          translatedText: data.translated_text,
          sourceLang: data.source_lang,
          targetLang: data.target_lang,
          speaker,
          timestamp: new Date().toISOString(),
          inputMode,
          confidence: data.confidence,
          riskFlags: data.risk_flags ?? [],
          needsReview: Boolean(data.needs_review),
        },
      ])
      // The turn is now committed to the transcript; drop the in-flight copy.
      setPendingSource(null)

      // Pull any medications out of this turn's English side (the doctor's own
      // English, or the English translation of the patient's Bangla). Not
      // awaited: it must not delay playback or the next turn.
      const englishText = data.source_lang === 'en' ? data.source_text : data.translated_text
      detectMedications(englishText)

      if (autoplay) speak.speak(data.translated_text)
      return data
    },
    [translateChunks, sourceLang, targetLang, activeSpeaker, autoplay, speak, detectMedications],
  )

  /**
   * Generate the AI summary from the current transcript.
   *
   * Each entry becomes one English turn: the doctor's own English utterance, or
   * the English translation of the patient's Bangla, so the note reads in one
   * language. The result is cached in state; callers (the summary tab, the
   * Regenerate button) invoke this and read `summary`/`summaryLoading`.
   */
  const generateSummary = useCallback(async () => {
    if (summaryLoading || entries.length === 0) return
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const data = await summarize({ turns: entriesToTurns(entries) })
      setSummary(data.summary)
    } catch (err) {
      setSummaryError(err)
    } finally {
      setSummaryLoading(false)
    }
  }, [entries, summaryLoading])

  /**
   * Assemble the session report and open the print / Save-as-PDF dialog.
   *
   * The report needs the AI summary; if the doctor never opened the summary tab
   * it is generated here first (a brief busy state), reusing whatever is already
   * cached otherwise. A summary failure is non-fatal -- the prescription still
   * prints with a "no summary" note and the confirmed medications.
   */
  const downloadReport = useCallback(async () => {
    if (reportBusy || entries.length === 0) return
    setReportBusy(true)
    try {
      let summaryText = summary
      if (!summaryText) {
        try {
          const data = await summarize({ turns: entriesToTurns(entries) })
          summaryText = data.summary
          setSummary(data.summary)
        } catch (err) {
          console.warn('[report] summary unavailable:', err?.code || err)
          summaryText = ''
        }
      }
      const html = buildPrescriptionHTML({
        summary: summaryText,
        medications,
        langLabel: `${getDisplayLabel(sourceLang)} ↔ ${getDisplayLabel(targetLang)}`,
        generatedAt: new Date(),
      })
      if (!openPrintWindow(html)) {
        console.warn('[report] print window was blocked by the browser')
      }
    } finally {
      setReportBusy(false)
    }
  }, [reportBusy, entries, summary, medications, sourceLang, targetLang])

  /**
   * Save the current session to the signed-in user's account.
   *
   * Guests are prompted to log in first (nothing is saved without an account).
   * The saved report is exactly the prescription's contents: the dialogue
   * transcript, the AI summary (generated here if not already), and the
   * confirmed medications. No audio is stored.
   */
  const saveReportToAccount = useCallback(async () => {
    if (!auth.user) {
      setAuthOpen(true)
      return
    }
    if (entries.length === 0 || saveState === 'saving') return
    setSaveState('saving')
    try {
      let summaryText = summary
      if (!summaryText) {
        try {
          const data = await summarize({ turns: entriesToTurns(entries) })
          summaryText = data.summary
          setSummary(data.summary)
        } catch {
          summaryText = ''
        }
      }
      const report = {
        title: `Consultation · ${new Date().toLocaleDateString()}`,
        language_pair: `${doctorLang}-${patientLang}`,
        summary: summaryText,
        transcript: entries.map((e) => ({
          speaker: e.speaker,
          sourceText: e.sourceText,
          translatedText: e.translatedText,
          sourceLang: e.sourceLang,
          targetLang: e.targetLang,
        })),
        medications: medications.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          timesPerDay: m.timesPerDay,
          timing: m.timing,
        })),
      }
      const token = await auth.getToken()
      if (!token) {
        setSaveState('idle')
        setAuthOpen(true)
        return
      }
      await saveReport({ report, token })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch (err) {
      console.warn('[report] save failed:', err?.code || err)
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }, [auth.user, auth.getToken, entries, saveState, summary, medications, doctorLang, patientLang])

  // Close the auth modal once a session exists (login or confirmed sign-up).
  useEffect(() => {
    if (auth.user) setAuthOpen(false)
  }, [auth.user])

  /**
   * Record-until-Done: finalised speech segments accumulate for the whole
   * utterance and are translated only when the user clicks Done.
   *
   * Chrome finalises a segment on every brief pause, so a spoken sentence
   * arrives as several `onFinalResult` calls. Rather than translate each
   * fragment (worse context) or auto-send after a silence (the old D-015
   * behaviour, which cut people off mid-thought), every segment is appended to
   * the buffer and shown live. The complete passage is sent once, on Done, and
   * chunkBySentence keeps each request within the backend's limit.
   */
  const segmentBufferRef = useRef([])
  const runTranslationRef = useRef(runTranslation)
  useEffect(() => {
    // finishRecording is called from an event handler that may have closed over
    // an older runTranslation (e.g. after a language swap); go through the ref
    // so it always sees the current one.
    runTranslationRef.current = runTranslation
  }, [runTranslation])

  const handleFinalResult = useCallback((text) => {
    segmentBufferRef.current.push(text)
    // Show the transcript building up as the user speaks.
    setLastFinalText(segmentBufferRef.current.join(' '))
  }, [])

  const speechLang = getLanguage(sourceLang)?.speechLang ?? 'en-US'
  const speech = useSpeech({ lang: speechLang, onFinalResult: handleFinalResult })

  /** Done: stop the mic and translate everything captured so far, as one turn. */
  const finishRecording = useCallback(() => {
    speech.stop()
    const transcript = segmentBufferRef.current.join(' ').trim()
    segmentBufferRef.current = []
    // Clear the live dictation; the sent turn now lives in pendingSource.
    setLastFinalText('')
    if (transcript) runTranslationRef.current(transcript, { inputMode: 'voice' })
  }, [speech])

  // Drive the recording timer from the listening state: reset when the mic
  // opens, tick once a second while it stays open.
  useEffect(() => {
    if (!speech.isListening) return undefined
    setListenSeconds(0)
    const id = setInterval(() => setListenSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [speech.isListening])

  // A network failure means Offline; a 400 or 500 does not, because the server
  // plainly answered.
  useEffect(() => {
    if (error?.code === 'NETWORK_ERROR') setBackendReachable(false)
  }, [error])

  const retry = useCallback(() => {
    const last = lastRequestRef.current
    if (last) runTranslation(last.text, { inputMode: last.inputMode })
  }, [runTranslation])

  // The old caption belongs to the old speaker/language; clearing it avoids
  // showing dictation under a label that now says something else.
  const changeSpeaker = useCallback((role) => {
    setRoles((prev) => ({ ...prev, activeSpeaker: role === 'patient' ? 'patient' : 'doctor' }))
    setLastFinalText('')
  }, [])

  const changeDoctorLang = useCallback((lang) => {
    if (!getLanguage(lang)) return
    // The two roles must speak different languages, so the patient takes the
    // other language automatically.
    setRoles((prev) => ({ ...prev, doctorLang: lang, patientLang: getOther(lang) }))
    setLastFinalText('')
  }, [])

  const changePatientLang = useCallback((lang) => {
    if (!getLanguage(lang)) return
    setRoles((prev) => ({ ...prev, patientLang: lang, doctorLang: getOther(lang) }))
    setLastFinalText('')
  }, [])

  const offline = backendReachable === false

  if (view === 'home') {
    return <Home onStart={() => setView('tool')} />
  }

  const authModal = authOpen ? (
    <AuthModal onClose={() => setAuthOpen(false)} onSignIn={auth.signIn} onSignUp={auth.signUp} />
  ) : null

  // The My reports screen is only reachable signed in; if the session ends
  // while it is open, fall back to the session view.
  if (view === 'reports' && auth.user) {
    return (
      <>
        <MyReports getToken={auth.getToken} onBack={() => setView('tool')} />
        {authModal}
      </>
    )
  }

  const liveText = [lastFinalText, speech.interimText].filter(Boolean).join(' ')

  return (
    <>
    <Studio
      sourceLang={sourceLang}
      targetLang={targetLang}
      doctorLang={doctorLang}
      patientLang={patientLang}
      activeSpeaker={activeSpeaker}
      onSpeakerChange={changeSpeaker}
      onDoctorLangChange={changeDoctorLang}
      onPatientLangChange={changePatientLang}
      onBack={() => setView('home')}
      offline={offline}
      isListening={speech.isListening}
      isSupported={speech.isSupported}
      liveText={liveText}
      listenSeconds={listenSeconds}
      entries={entries}
      pending={pendingSource}
      isTranslating={isLoading}
      error={error}
      onRetry={retry}
      onStart={speech.start}
      onStop={finishRecording}
      onSubmit={(text) => runTranslation(text, { inputMode: 'typed' })}
      onSpeak={speak.speak}
      hasVoice={speak.hasVoice}
      isSpeaking={speak.isSpeaking}
      summary={summary}
      summaryLoading={summaryLoading}
      summaryError={summaryError}
      onGenerateSummary={generateSummary}
      medications={medications}
      onStartEditMedication={startEditMedication}
      onRemoveMedication={removeMedication}
      medicationModal={medicationModal}
      onConfirmMedicationModal={confirmMedicationModal}
      onDismissMedicationModal={dismissMedicationModal}
      onDownloadReport={downloadReport}
      onSaveReport={saveReportToAccount}
      reportBusy={reportBusy}
      canReport={entries.length > 0}
      saveState={saveState}
      authConfigured={auth.configured}
      accountEmail={auth.user?.email ?? null}
      onOpenAuth={() => setAuthOpen(true)}
      onLogout={auth.signOut}
      onOpenReports={() => setView('reports')}
    />
    {authModal}
    </>
  )
}
