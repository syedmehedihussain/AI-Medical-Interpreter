# prd.md

**AI Medical Interpreter v0.1 — Product Requirements**
Last updated: 2026-07-20

---

## 1. Users

Only one user role exists in v0.1: **the operator**, in practice a doctor or nurse holding a phone or sitting at a clinic desktop. The patient is a participant but never touches the device.

There is no login, so the app makes no distinction between people. Everyone gets the same screen.

## 2. The screen

One page. Top to bottom:

```
┌──────────────────────────────────────────┐
│  AI Medical Interpreter                    ● Ready      │  header + engine status
├──────────────────────────────────────────┤
│   [ English  ]   ⇄   [ বাংলা ]            │  language bar
├──────────────────────────────────────────┤
│                                          │
│   Live caption appears here as you       │  capture panel
│   speak, growing word by word...         │
│                                          │
│         (   Start listening   )          │  primary action
│                                          │
│   or type instead ▾                      │  disclosure
├──────────────────────────────────────────┤
│   Translation                     🔊     │  output panel
│   এখানে অনুবাদ দেখা যাবে                 │
├──────────────────────────────────────────┤
│   This session                           │  transcript
│   ─────────────                          │
│   EN  I have chest pain          10:42   │
│   BN  আমার বুকে ব্যথা করছে              │
│                                          │
│   BN  কতদিন ধরে?                 10:42   │
│   EN  For how many days?                 │
└──────────────────────────────────────────┘
```

On mobile the panels stack in the same order. The primary action button stays reachable with a thumb.

## 3. Features

### F-1 — Language pair selection

- Two selectors: source and target. v0.1 offers exactly two languages: English (`en`) and Bangla (`bn`).
- A swap control exchanges them in one tap.
- Selecting the same language on both sides is impossible — picking a language on one side auto-swaps the other.
- The current pair persists in `localStorage` so it survives a refresh.
- Default on first visit: source English, target Bangla.

### F-2 — Live speech capture

- Primary button toggles between "Start listening" and "Stop listening."
- While listening: the button changes appearance, a pulsing indicator shows, and the header status reads "Listening."
- Recognition runs in **continuous** mode with **interim results** enabled, so partial text appears while the person is still speaking.
- Interim text renders in a muted style; finalized text renders solid. This distinction must be visible without relying on color alone.
- When a phrase is finalized, it is immediately sent for translation. The person does not press anything.
- Recognition language is set from the current source language (`en-US` or `bn-BD`).
- If recognition stops on its own (browsers do this after silence), it restarts automatically as long as the user hasn't pressed stop.

### F-3 — Translation

- Triggered by a finalized speech segment, or by the manual text form.
- Sends `text`, `source_lang`, `target_lang`, and `context` to the backend.
- While in flight, the output panel shows a loading state. The previous translation stays visible underneath rather than being cleared — an empty panel mid-conversation is worse than a stale one.
- On success, the output panel updates and a new pair is appended to the transcript.
- Empty or whitespace-only input is rejected client-side without a network call.
- Requests are debounced so that rapid finalized segments don't stack up: if a new segment arrives while one is in flight, the older in-flight request is abandoned on arrival (its result is discarded).

### F-4 — Speech playback

- A speaker button on the output panel reads the translation aloud using the browser's speech synthesis.
- Autoplay is **on by default** — the clinical use case is hands-free — with a toggle to turn it off.
- Voice is selected by matching the target language code against available system voices.
- If no voice exists for the target language, the button is disabled and shows a tooltip explaining why. The text is still readable, so this is a degraded state, not an error.

### F-5 — Manual text entry

- Collapsed behind a "or type instead" disclosure so it doesn't compete with the voice flow.
- A textarea plus a "Translate" button.
- Same endpoint, same response handling, same transcript entry as voice. This is important: manual entry is not a separate code path, it just skips the ASR step.
- Enter submits; Shift+Enter inserts a newline.

### F-6 — Session transcript

- An append-only list of every translated exchange in the current page session.
- Each entry shows: source language badge, original text, target language badge, translated text, and a timestamp.
- Newest at the bottom, auto-scrolled into view.
- A "Clear" control empties the list, with a confirmation, since there is no undo.
- **Lives in React state only.** A page refresh loses it. This is stated in the empty state so nobody is surprised.

### F-7 — Engine status indicator

A small dot and label in the header, with four states:

| State | Meaning |
|---|---|
| Ready | Idle, backend reachable |
| Listening | Microphone active |
| Translating | Request in flight |
| Offline | Backend unreachable or no network |

Status is checked once on load via a `GET /api/health` call and updated by request outcomes thereafter.

## 4. Primary flow

1. Person opens the app. Status shows Ready. Language pair defaults to EN → BN.
2. They tap **Start listening**.
3. Browser prompts for microphone permission. They allow it.
4. Status changes to Listening. Indicator pulses.
5. They speak: "How long have you had this pain?"
6. Interim caption appears and grows: "how long" → "how long have you had" → "how long have you had this pain"
7. Recognition finalizes the phrase. Caption becomes solid.
8. Request goes out. Output panel shows loading.
9. Bangla translation appears and is spoken aloud.
10. Entry is appended to the transcript.
11. Recognition is still running. They keep talking, or tap the swap button so the patient can reply in Bangla.

## 5. Edge cases

Each of these has a defined behavior. None of them may result in a blank screen or an unhandled exception.

### Browser and permissions

| # | Situation | Behavior |
|---|---|---|
| E-1 | Browser has no Speech Recognition API (Firefox) | On load, hide the listen button entirely, show a notice naming Chrome and Edge, and expand the manual text input by default. The app remains fully usable by typing. |
| E-2 | Microphone permission denied | Stop listening, show: "AI Medical Interpreter needs microphone access to hear speech. Enable it in your browser's site settings, then try again." Manual input expands. |
| E-3 | Permission dismissed rather than denied | Same message. Button returns to "Start listening" so they can retry. |
| E-4 | Page served over plain HTTP | Speech APIs require a secure context. Detect and show: "Voice input needs a secure connection. Open this page over HTTPS or on localhost." |
| E-5 | No microphone hardware present | Caught as a recognition error; same message as E-2 with the hardware case mentioned. |
| E-6 | Another tab already holds the microphone | Recognition errors out. Show: "Another tab or app is using the microphone. Close it and try again." |

### Speech recognition

| # | Situation | Behavior |
|---|---|---|
| E-7 | Person taps Start and says nothing | After ~8 seconds of silence, browsers fire a no-speech event. Auto-restart silently. Do not surface an error — silence is normal in a consultation. |
| E-8 | Recognition auto-stops mid-session | Restart automatically. Track a restart counter; after 5 consecutive restarts with no speech, stop and show "Listening paused. Tap to resume." |
| E-9 | Very loud background noise | Nothing special. Whatever the browser returns is what gets translated. Documented as a known limitation. |
| E-10 | Person speaks the wrong language for the selected source | Recognition returns garbage. No detection in v0.1. The transcript will show nonsense — acceptable, and a motivation for the dialect-detection work later. |
| E-11 | Extremely long single utterance | Cap finalized segments at 500 characters before sending. Longer input is truncated and a note is shown. |

### Network and backend

| # | Situation | Behavior |
|---|---|---|
| E-12 | Backend unreachable | Status → Offline. Output panel shows "Can't reach the translation service. Check your connection." Transcript is preserved. Listening continues so nothing is lost from the caption. |
| E-13 | Backend returns 500 | Show "Translation failed. Try again." with a retry button that resends the same text. |
| E-14 | Translation provider rate-limits (429) | Show "Too many requests right now. Wait a moment and try again." Do not auto-retry. |
| E-15 | Request takes longer than 15 seconds | Abort the request, show a timeout message with a retry button. |
| E-16 | Provider API key missing or invalid | Backend logs the real reason and returns a generic 503. The UI shows "Translation service unavailable." The key is never echoed to the client. |
| E-17 | Two translations in flight at once | The older response is discarded on arrival. Only the newest request may update the output panel. |

### Input and output

| # | Situation | Behavior |
|---|---|---|
| E-18 | Empty or whitespace-only submission | Button disabled; no request sent. |
| E-19 | Provider returns an empty string | Treat as a failure. Show "No translation returned. Try rephrasing." |
| E-20 | Source and target are the same | Prevented in the UI. If it somehow happens, backend returns the input unchanged with a note. |
| E-21 | No TTS voice for Bangla | Speaker button disabled with an explanatory tooltip. Text still displays. |
| E-22 | TTS still speaking when a new translation arrives | Cancel the current utterance and speak the new one. |
| E-23 | Bangla renders as boxes (missing font) | Load a Bangla webfont explicitly rather than depending on the system. |

## 6. Non-functional expectations

- Translation round-trip under 5 seconds on a normal connection (SRS NFR-1.1)
- Interim caption latency under 1 second from speech (SRS NFR-1.2)
- Initial page load under 3 seconds (SRS NFR-1.3)
- Full keyboard operation: every control reachable by Tab with a visible focus ring (SRS NFR-6.1)
- Status never conveyed by color alone — always paired with text or an icon (SRS NFR-6.3)
- Bangla body text at 18px minimum; Bangla script is less legible than Latin at small sizes
- `prefers-reduced-motion` respected for the pulsing listen indicator

## 7. Copy

Fixed strings, so they stay consistent across the app.

| Context | Text |
|---|---|
| Idle button | Start listening |
| Active button | Stop listening |
| Manual disclosure | or type instead |
| Manual submit | Translate |
| Output placeholder | Translation will appear here |
| Transcript empty | Nothing yet. Start listening or type a sentence to begin. Session history clears when you refresh. |
| Mic denied | AI Medical Interpreter needs microphone access to hear speech. Enable it in your browser's site settings, then try again. |
| Unsupported browser | Voice input isn't available in this browser. Use Chrome or Edge, or type your text below. |
| Offline | Can't reach the translation service. Check your connection. |
| Timeout | That took too long. Try again. |
| Generic failure | Translation failed. Try again. |
| Clear confirm | Clear this session's transcript? It can't be recovered. |

Errors state what happened and what to do. They don't apologize.
