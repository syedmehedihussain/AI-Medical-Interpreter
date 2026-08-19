# decisions.md

**AI Medical Interpreter — Decision Log**

A running record of what was chosen and why. Newest entries go at the top.

Add an entry whenever a choice was non-obvious, when something was rejected, or when a plan changed mid-build. Six months from now this file is the only thing that remembers the reasoning — and it is what turns a viva answer from "I don't know, it was already like that" into a defensible argument.

**Format:** ID · Date · Decision · Context · Options considered · Choice and reasoning · Consequences · Revisit when

---

## D-017 · 2026-07-26 · Replace MyMemory with Google's keyless endpoint, and flag wrong-script output

**Context.** The developer reported translations appearing in Romanised Bangla rather than Bengali script. Measured against 18 common conversational phrases, MyMemory failed 5:

| Input | MyMemory returned | Problem |
|---|---|---|
| `hello` | `ami tomake chai` | Roman script, and means "I want you" |
| `good morning` | `शुभ प्रभात` | **Hindi**, not Bangla |
| `how are you` | `apni kemon achen` | Right meaning, wrong script |
| `what is your name` | `ai tomar naam ki` | Roman script |
| `I am fine` | `I am fine` | Not translated |

MyMemory is a translation *memory*: it returns community-contributed matches, so quality varies by whether a human happened to contribute a good one. That is unfixable from our side.

**Options.** (a) Keep MyMemory and document the limitation. (b) Wait for a Google Cloud key. (c) Use Google's keyless web endpoint, the text sibling of the TTS endpoint already accepted in D-016. (d) A public LibreTranslate or Lingva instance.

**Choice.** (c), plus a script check that flags suspect output regardless of provider.

**Reasoning.** Measured rather than assumed: the same 18 phrases through Google's keyless endpoint returned **18 of 18 in correct Bengali script**, including all five MyMemory failures. LibreTranslate's public instance now requires an API key. Lingva worked but is a third-party proxy with unknown uptime.

The endpoint carries the same caveat already accepted for TTS: undocumented, no service guarantee, development and demo only. `google.py`, the real Cloud Translation v2 client, remains what the deployed build should use. Consistency matters here: it would be strange to accept the risk for audio and refuse it for text.

**The script check is the more important half.** Showing `शुभ प्रभात` to a Bangla-speaking patient, with nothing indicating anything went wrong, is a real harm and not a cosmetic defect. So `services/quality.py` measures what share of the output's letters belong to the target script, and below half it sets `needs_review` and attaches a `low_confidence` risk flag.

**This is the first real use of `needs_review` and `risk_flags`.** Until now they were always `false` and `[]`, present only so the shape would not change when a safety layer arrived (D-011). It arrived. The envelope absorbed it with no contract change, no new field, and no frontend restructuring, which is the clearest possible evidence that D-011 was the right call.

It **flags rather than blocks**: the translation is still returned and displayed with a visible warning, because a suspicious translation a clinician can judge beats none, and the operator is qualified to judge.

**Consequences.** Two thresholds, both deliberate. Output must be at least 50% target-script letters, not 100%, because correct Bangla legitimately contains Latin drug names and dosages ("Napa 500mg"). And output with fewer than four letters is never judged, because "500 mg" and "ORS" are legitimate untranslated outputs and flagging them would train the operator to ignore the warning.

**Revisit** when a Google Cloud key exists: switch to `google`. The script check stays regardless -- it is provider-independent and is the seed of the clinical safety layer the SRS describes.

---

## D-016 · 2026-07-26 · Add server-side text-to-speech as a fallback

**Context.** `stack.md` section 1 locks text-to-speech to the browser's Web Speech Synthesis API. That API can only use voices the operating system already has. The developer's desktop Chrome has no Bangla voice, so half the product was silent, and the first attempt at handling this correctly (refusing to speak rather than mispronouncing, D-015's companion fix) made the silence total. "It is not talking to me back at all" is a fair description of a translation app that cannot speak.

No frontend change can fix this. The missing piece is on the machine, not in the code.

**Options.** (a) Ask every operator to install a system voice. (b) Accept desktop silence and demo on Android, which ships a Bangla voice. (c) Add a server-side TTS endpoint used when no local voice exists.

**Choice.** (c), decided by the developer after the tradeoffs were laid out.

**Reasoning.** (a) fixes one machine and not the examiner's. (b) is real -- `prd.md`'s scenario is a doctor holding a phone, and Android does have Bangla TTS -- but it makes the demo dependent on which device is in the room, which is a bad thing to discover during a presentation.

(c) makes speech a property of the application rather than of whoever's laptop it runs on. Local voices are still preferred when present: lower latency, works offline, no bandwidth. The server is a fallback, not a replacement.

**Consequences.**

- **A fifth seam.** `services/tts_base.py` is shaped exactly like seam 1, so Google Cloud Text-to-Speech, or a self-hosted model, is one new file plus one environment variable.
- **`GET /api/speech` is the only endpoint that does not return the `schema.md` envelope**, because a successful response is audio. Errors still return the standard error envelope, so frontend failure handling is unchanged. GET rather than POST so an `<audio>` element can load the URL directly and get streaming and buffering for free.
- **The development provider is an undocumented Google endpoint with no service guarantee.** Same tradeoff as D-014: no credentials, so it works today. It could break without notice. The deployed build should use Google Cloud Text-to-Speech. Documented as a known limitation.
- Audio is cached for a day by URL, so a repeated phrase costs no second round trip.
- Autoplay may be blocked by the browser until a user gesture has occurred. Handled silently; pressing the speaker button is itself the gesture.

**Revisit** when a Google Cloud key exists: add `google_cloud` to `_TTS_PROVIDERS` and switch `TTS_PROVIDER`. Also revisit at v0.4, when server-side audio is already in play for Whisper and the two could share a transport.

---

## D-015 · 2026-07-26 · Buffer finalised speech segments instead of translating each one

**Context.** `prd.md` F-2 specifies that a finalised phrase is sent for translation immediately. In real use, Chrome finalises a segment on every brief pause, including mid-sentence thinking pauses. The first live test produced exactly the predicted failure: "it cuts off in the middle sometimes." A sentence like "I have chest pain ... since yesterday" arrived as two final results and became two half-sentence translations.

**Options.** (a) Keep sending each final immediately, as specified. (b) Buffer finals and send after a quiet period. (c) Buffer, but flush on sentence-ending punctuation.

**Choice.** (b), with a 1000ms quiet window, plus an immediate flush when the buffer reaches the 500-character limit or when the user presses stop.

**Reasoning.** Two problems, one fix. It reads to the user as being interrupted mid-thought, and it translates *worse*, because a fragment carries less context than a sentence and general-domain engines lean heavily on context.

(c) was rejected because speech recognition punctuation is unreliable across languages and effectively absent for Bangla, so it would work in English and silently fail in the other half of the product.

The cost is up to one second of added latency against the 5s budget in NFR-1.1, where the provider round trip is already about a second. Whole sentences are worth a second.

**Consequences.** A departure from `prd.md` F-2 as written; that line should be updated to describe the buffer. Pressing stop mid-sentence still translates what was already said rather than discarding it. The timer is called through a ref so that a language change while a flush is pending cannot send text with the previous language pair.

**Revisit** if the window feels sluggish in clinical use, or when server-side ASR arrives in v0.4 and segmentation becomes ours to control rather than Chrome's.

---

## D-014 · 2026-07-25 · Add MyMemory as a keyless development provider

**Context.** Google Cloud Translation requires a project with billing enabled. That account setup had not happened, so every translation in the running app was returning the stub's `[bn] <text>` echo. The pipeline was complete and correct end to end, and the product still looked broken to anyone using it, because the one thing a translation app must do was visibly not happening.

**Options.** (a) Wait for the Google key and demo with the stub until then. (b) Make the stub's placeholder nature louder in the UI. (c) Add a second real provider that needs no credentials.

**Choice.** (c). MyMemory's anonymous API: no key, no signup, supports Bengali. `TRANSLATION_PROVIDER=mymemory` in development. The Google provider was written in the same change and is registered and ready.

**Reasoning.** Being blocked on a billing form is not an engineering constraint, and "it works apart from the translation" is not a demonstrable state. MyMemory removes the block in an afternoon.

It also, usefully, proves the seam rather than asserting it. Adding two providers cost two lines in `registry.py` plus one new file each. No router, no model, no frontend code changed. That is a better answer to "why is there a provider interface?" than a diagram.

**Consequences.** MyMemory's quality is below Google's, noticeably so on short phrases: "How are you?" returned `আপনি একটি মেয়ে` ("you are a girl"). Full clinical sentences are good -- "How long have you had this pain?" returned `আপনি কতদিন ধরে এই ব্যথা ভোগ করছেন?`, which is correct. The anonymous quota is roughly 5000 characters a day.

**This is a development stopgap, not the shipped provider.** Google remains the target for the deployed build and for anything shown as a quality result. Do not present MyMemory output as representative when discussing translation quality, since the general-domain weakness argument in `scope.md` section 7 depends on measuring the *right* baseline.

**Revisit** the moment a Google API key exists: set `TRANSLATION_PROVIDER=google` and re-run the Stage 2 gate.

---

## D-013 · 2026-07-25 · Accept React 19 and Vite 8 instead of the pinned 18 and 5

**Context.** `stack.md` section 1 locks React at 18.x and Vite at 5.x. Running `npm create vite@latest -- --template react` in July 2026 scaffolds React 19.2.7 and Vite 8.1.5. The pinned versions were written when they were current; they no longer are.

**Options.** (a) Force the pinned versions by downgrading. (b) Accept what the scaffold produces and record the change. (c) Pin only React, take current Vite.

**Choice.** (b).

**Reasoning.** Nothing in v0.1 uses an API that differs between these versions. The app is `useState`, `useEffect`, `useRef`, and `useCallback`, with no class components, no legacy lifecycle methods, no `ReactDOM.render`, and no state library whose peer dependency could conflict. React 19's breaking changes are concentrated in APIs this project never touches.

Against that, downgrading has real costs: it means fighting the scaffold on every fresh clone, pinning versions that will keep ageing, and explaining in a viva why the project runs a deliberately old React with no benefit to point at. "The document was written before the release" is a better answer than a downgrade that bought nothing.

The locked-stack rule in `stack.md` exists to stop mid-build churn over preferences, not to freeze version numbers against time. This is the escape hatch that section prescribes being used as intended.

**Consequences.** `stack.md` section 1 is now out of date on two rows and should be read alongside this entry. Any React 18-specific guidance found online may not apply. If a genuine incompatibility appears, this is cheap to revisit: the app has no version-sensitive code, so downgrading later is a `package.json` edit and a reinstall.

**Revisit** if a dependency added later demands React 18, or if a React 19 behaviour change breaks something. Verified working at the Stage 3 gate.

---

## D-012 · 2026-07-20 · Store no raw audio at all

**Context.** SRS NFR-3.3 requires raw audio to be deleted after transcription unless consent is given for retention. SRS 7.5 includes a `raw_audio_url` column.

**Options.** (a) Store audio with a deletion job. (b) Store audio only with consent. (c) Never store audio; drop the column.

**Choice.** (c) for v0.1, and provisionally beyond.

**Reasoning.** In v0.1 audio never leaves the browser — recognition runs client-side and only text is sent to the server. That makes the privacy requirement true by construction rather than by policy, which is much stronger. Deletion jobs fail; code that never writes cannot leak. When Whisper arrives in v0.4 audio will be sent to the server, but it can be held in memory for the duration of transcription and discarded without ever hitting disk.

**Consequences.** No retained corpus from production use. Thesis training data must be collected separately with explicit consent, which is the correct process anyway.

**Revisit** if a consented research-retention feature is genuinely required.

---

## D-011 · 2026-07-20 · Freeze the response envelope before it's needed

**Context.** A general translation API returns none of `confidence`, `risk_flags`, `detected_dialect`, or `needs_review`. the fine-tuned medical model will return all of them.

**Options.** (a) Return only what Google gives, add fields later. (b) Include all fields now as `null` / `[]` / `false`.

**Choice.** (b).

**Reasoning.** Adding a field to a response later means auditing every component that consumes it. Adding it now costs a few lines and forces the frontend to handle absence from day one, which it will have to do anyway. It also makes the architecture legible in the report: the clinical safety layer has a named, visible place to plug into rather than being hand-waved as future work.

**Consequences.** Slightly odd-looking responses full of nulls in v0.1. Worth explaining once in the README.

**Revisit** never — this is the contract.

---

## D-010 · 2026-07-20 · Accept `context` in requests but ignore it

**Context.** SRS FR-3 specifies a clinical context selector feeding the translation engine. There is no engine that can use it yet.

**Options.** (a) Omit the field until there's a model. (b) Accept and validate it, ignore it downstream. (c) Build the UI selector too.

**Choice.** (b). No UI selector in v0.1.

**Reasoning.** Same logic as D-011 for the field itself. But a visible selector that demonstrably changes nothing is worse than no selector — it's a lie in the interface. So the field exists in the contract, and the control arrives with the capability in v0.3.

**Revisit** at v0.3 when an LLM provider can act on it.

---

## D-009 · 2026-07-20 · Frontend `useSpeech` hook as the ASR seam

**Context.** v0.1 uses browser speech recognition. v0.4 needs Whisper over WebSocket.

**Choice.** All speech recognition is confined to `src/hooks/useSpeech.js`, exposing a fixed interface: `{ isListening, interimText, finalText, error, isSupported, start, stop }`.

**Reasoning.** Components subscribe to state, not to an engine. A WebSocket implementation can produce the same interface — interim results become partial messages from the server, final results become completed segments. Nothing above the hook changes.

**Consequences.** The hook must not leak `SpeechRecognition` objects or browser-specific error strings to callers. Errors are translated into the app's own error vocabulary inside the hook.

---

## D-008 · 2026-07-20 · Google Cloud Translation v2, not an LLM

**Context.** v0.1 needs Bangla↔English translation from a hosted service.

**Options.** Google Translate v2, Microsoft Translator, DeepL, Gemini, Claude.

- DeepL — eliminated immediately, no Bangla.
- Gemini / Claude — good quality, can follow clinical-tone instructions, but 2–5× the latency and non-deterministic output. Latency matters for live speech.
- Microsoft Translator — genuinely comparable, 2M free characters/month.
- Google Translate v2 — sub-second, a plain REST call with an API key, no SDK or OAuth flow, reliable Bangla.

**Choice.** Google Translate v2, with Microsoft as the documented fallback.

**Reasoning.** For a live voice loop, latency is the product. An LLM's ability to handle clinical phrasing is valuable but belongs in v0.3's summary feature, where a few seconds don't matter.

**Consequences.** Requires a Google Cloud project with billing enabled, which can be a hurdle. Provider choice sits behind an interface, so switching is one new file and one env var.

**Revisit** if Google Cloud billing setup proves impossible, or at v0.3 when comparing clinical translation quality against an LLM.

---

## D-007 · 2026-07-20 · Anonymous-user dependency instead of no auth concept at all

**Context.** v0.1 has no login, but v0.2 does.

**Options.** (a) No user concept; add it later. (b) `get_current_user()` returning a fixed anonymous user, with endpoints already declaring the dependency.

**Choice.** (b).

**Reasoning.** Retrofitting auth means editing every endpoint signature. Declaring `user = Depends(get_current_user)` today means one function body changes later and every route is already wired. It also makes the ownership rules in `schema.md` §5 implementable without restructuring.

---

## D-006 · 2026-07-20 · No database in v0.1

**Context.** SRS specifies PostgreSQL with seven tables.

**Options.** (a) Postgres now. (b) SQLite now. (c) Nothing; in-memory only.

**Choice.** (c), with a `SessionRepository` protocol defined and an in-memory implementation that nothing calls.

**Reasoning.** A database before the translation pipeline works is weeks of models, sessions, and migrations blocking the one thing that proves the project viable. The protocol costs an afternoon and means v0.2 adds an implementation rather than reorganizing the codebase.

**Consequences.** Transcript is lost on refresh. Stated in the empty-state copy so it isn't a surprise.

**Revisit** at v0.2. SQLite first, Postgres only if the deployment target requires it.

---

## D-005 · 2026-07-20 · Browser Web Speech API instead of Whisper

**Context.** SRS specifies a fine-tuned Whisper model behind a WebSocket for ASR.

**Options.** (a) Whisper on the server with WebSocket streaming. (b) A hosted ASR API. (c) The browser's built-in Web Speech API.

**Choice.** (c).

**Reasoning.** The browser API is roughly 30 lines of JavaScript against several hundred plus a model runtime and GPU or heavy CPU cost. It streams interim results natively — the live-caption effect the SRS describes comes for free. It's free to run and supports `bn-BD`. The only real cost is browser support, and the fallback (manual text entry) is already a required feature.

The dialect work that motivates the whole thesis genuinely requires a fine-tuned Whisper. But that is v1.0, and having a working app first makes that work easier, not harder.

**Consequences.** Chrome and Edge only. No dialect capability. Both documented as known limitations in `scope.md` §7 — and the second one is precisely the research gap being argued for.

**Revisit** at v0.4.

---

## D-004 · 2026-07-20 · React + Vite, not Next.js

**Context.** SRS names Next.js.

**Choice.** React with Vite.

**Reasoning.** v0.1 is one page with no routing and no server-rendering requirement. Next.js adds a router, a server runtime, and a rendering model to learn for no benefit at this size. Vite's config is short and its hot reload is instant, which matters when the feedback loop is the main learning mechanism.

**Consequences.** SEO and SSR unavailable. Neither matters for a clinical tool behind a login. Migration later is mostly file relocation.

**Revisit** if a marketing site or public-facing pages become part of the project.

---

## D-003 · 2026-07-20 · JavaScript, not TypeScript

**Context.** TypeScript is the better engineering choice and is standard in the ecosystem.

**Choice.** Plain JavaScript.

**Reasoning.** Learning React, HTTP, async, and web APIs simultaneously is already a large load. TypeScript adds a second language where every type error becomes a hard blocker. The place type safety actually protects this project is the API boundary, and that's enforced by Pydantic on the backend, with the contract written down in `schema.md`.

**Consequences.** No compile-time safety on the frontend. More runtime bugs. Acceptable at this size.

**Revisit** at v0.2 if the frontend grows past roughly fifteen components.

---

## D-002 · 2026-07-20 · v0.1 scope cut to a single translation flow

**Context.** The SRS specifies 13 functional requirement groups, 8 non-functional groups, 7 tables, 14 use cases, and an admin dashboard. That's a team's six months.

**Choice.** v0.1 implements voice-in → translate → voice-out, EN↔BN, with no auth, no database, and no clinical layer.

**Reasoning.** A walking skeleton that runs end to end is worth more than five half-built subsystems. Every deferred feature gets a named seam so that deferring is a scheduling decision, not a design debt.

**Consequences.** The SRS and the implementation diverge, and that gap must be explained rather than hidden. Framing: *"The SRS specifies the complete system. v0.1 implements the core pipeline end-to-end with defined extension points for the remaining modules."*

---

## D-001 · 2026-07-20 · Web app first, model training later

**Context.** The original instinct was to start by training a dialect translation model.

**Options.** (a) Train first, build the app around it. (b) Build the app against a hosted API, train later.

**Choice.** (b).

**Reasoning.** There is no usable Sylheti or Chatgaiya speech corpus, so training starts with months of data collection. Meanwhile the deliverable for CSE309 is a web application. Building against a hosted API produces a working, demonstrable system, and — importantly — establishes the baseline that any future fine-tuned model must beat. That baseline is a real experimental asset, not a compromise.

**Consequences.** No dialect support in v0.1. The general-purpose API's weakness on clinical Bangla becomes the documented motivation for the thesis work rather than an embarrassment.

---

## Template

```
## D-0XX · YYYY-MM-DD · One-line decision

**Context.** What forced a choice.

**Options.** What was on the table.

**Choice.** What was picked.

**Reasoning.** Why. Be honest — "it was simpler" is a valid engineering reason.

**Consequences.** What this costs or forecloses.

**Revisit** when X happens.
```
