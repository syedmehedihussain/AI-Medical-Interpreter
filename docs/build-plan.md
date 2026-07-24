# build-plan.md

**Torongo v0.1 — Ordered Task List**
Last updated: 2026-07-20

Ordered so that something works at the end of every stage. Do not skip ahead. Each task has an acceptance check — if you can't tick it, don't move on.

Budget assumption: ~1 hour per day. Estimates are in sessions, not calendar days.

---

## Stage 0 — Environment (3 sessions)

Nothing to build. Get the tools working.

| # | Task | Done when |
|---|---|---|
| 0.1 | Install Node 20+, Python 3.11+, Git, VS Code | `node -v`, `python --version`, `git --version` all print versions |
| 0.2 | Install Claude Code | `claude` runs in the terminal |
| 0.3 | Create the GitHub repo `torongo`, clone it locally | Folder exists with `.git` inside |
| 0.4 | Copy the six `docs/*.md` files into the repo | `docs/` has scope, prd, stack, schema, build-plan, decisions |
| 0.5 | Create `CLAUDE.md` at the repo root | File exists and names the stack |
| 0.6 | Create `.gitignore` | Covers `node_modules/`, `__pycache__/`, `.env`, `venv/`, `dist/` |
| 0.7 | First commit and push | Repo visible on GitHub |
| 0.8 | Get a Google Cloud Translation API key | Key string in hand, Translation API enabled on the project |

**Stage 0 gate:** repo is on GitHub with docs committed, and you have an API key.

> On 0.8: create a Google Cloud project, enable the Cloud Translation API, create an API key under Credentials, and restrict it to the Translation API. Billing must be enabled even for free-tier use. If this is blocked, use Microsoft Translator instead — record the swap in `decisions.md`.

---

## Stage 1 — Backend skeleton (4 sessions)

Goal: a FastAPI server that returns fake translations. No provider, no frontend.

| # | Task | Done when |
|---|---|---|
| 1.1 | `backend/` with a virtualenv and `requirements.txt` | `pip install -r requirements.txt` succeeds |
| 1.2 | `app/main.py` — FastAPI app with CORS | `uvicorn app.main:app --reload` serves `/docs` |
| 1.3 | `app/config.py` — settings from `.env` via pydantic-settings | Settings load; missing key doesn't crash startup |
| 1.4 | `app/models.py` — request/response Pydantic models per `schema.md` §2 | Models match the documented shapes exactly |
| 1.5 | `app/services/base.py` — `TranslationProvider` protocol | Protocol defined with the signature from `stack.md` §4 |
| 1.6 | `app/services/stub.py` — fake provider returning `[bn] <text>` | Implements the protocol |
| 1.7 | `app/services/registry.py` — picks the provider from config | Returns the stub when `TRANSLATION_PROVIDER=stub` |
| 1.8 | `app/deps.py` — `get_current_user()` returning the anonymous user | Returns `CurrentUser(is_anonymous=True)` |
| 1.9 | `app/routers/health.py` — `GET /api/health` | Returns the envelope from `schema.md` §2.2 |
| 1.10 | `app/routers/translate.py` — `POST /api/translate/text` | Calls the provider, returns the full envelope |
| 1.11 | `app/routers/languages.py` — `GET /api/languages` | Returns `en` and `bn` |
| 1.12 | Error handling: exception handlers producing the error envelope | All error codes from `schema.md` §2.1 reachable |
| 1.13 | Validation: length, blank, same-language, unknown language | Each returns the right code and HTTP status |

**Stage 1 gate:** at `http://localhost:8000/docs` you can send `{"text": "hello", "source_lang": "en", "target_lang": "bn"}` and get back a well-formed envelope. Sending `{"text": ""}` returns `EMPTY_INPUT`. Sending `source_lang == target_lang` returns `SAME_LANGUAGE`.

Commit: `feat(backend): translation endpoint with stub provider`

---

## Stage 2 — Real translation (2 sessions)

| # | Task | Done when |
|---|---|---|
| 2.1 | `app/services/google.py` — Google Translate v2 via `httpx` | Real Bangla comes back |
| 2.2 | Wire it into the registry under `TRANSLATION_PROVIDER=google` | Switching the env var switches providers with no code change |
| 2.3 | Timeout handling → `PROVIDER_TIMEOUT` | Setting a 1ms timeout produces a 504 with the right code |
| 2.4 | Upstream error mapping → `PROVIDER_UNAVAILABLE`, `PROVIDER_RATE_LIMITED` | A bad key produces a 503, not a stack trace |
| 2.5 | Log latency and provider name into `meta` | `latency_ms` is a real number |

**Stage 2 gate:** through `/docs`, "How long have you had this pain?" returns correct Bangla. Removing the API key returns a clean 503.

Commit: `feat(backend): google translation provider`

---

## Stage 3 — Frontend skeleton (3 sessions)

Goal: a page that talks to the backend. No voice yet.

| # | Task | Done when |
|---|---|---|
| 3.1 | `npm create vite@latest frontend -- --template react` | Dev server runs on 5173 |
| 3.2 | Install and configure Tailwind | A Tailwind class visibly applies |
| 3.3 | `src/lib/languages.js` — code constants and BCP-47 mapping | `en`/`bn` defined with speech tags |
| 3.4 | `src/api/client.js` — `getHealth`, `getLanguages`, `translate` | Every fetch in the app goes through this file |
| 3.5 | `src/components/Header.jsx` + `StatusDot.jsx` | Status reflects the real `/api/health` result |
| 3.6 | `src/components/LanguageBar.jsx` with swap | Swap exchanges source and target |
| 3.7 | `src/components/ManualInput.jsx` | Typing and submitting shows a translation |
| 3.8 | `src/components/OutputPanel.jsx` with loading state | Loading shows; previous text isn't cleared mid-request |
| 3.9 | Language pair persisted to `localStorage` | Refresh keeps the pair |
| 3.10 | Frontend error rendering for every error code | Each maps to a message from `prd.md` §7 |

**Stage 3 gate:** type an English sentence, press Translate, see Bangla. Stop the backend and see the offline message.

Commit: `feat(frontend): manual translation flow`

---

## Stage 4 — Voice input (4 sessions)

The hardest stage. Slow down here.

| # | Task | Done when |
|---|---|---|
| 4.1 | `src/hooks/useSpeech.js` returning the interface in `stack.md` §4 | Hook exists and is the only place `SpeechRecognition` is referenced |
| 4.2 | Support detection → `isSupported` | Firefox shows the unsupported notice; Chrome doesn't |
| 4.3 | Continuous mode + interim results | Text appears while speaking |
| 4.4 | Recognition language driven by the selected source | Switching to Bangla makes Bangla recognizable |
| 4.5 | `src/components/CapturePanel.jsx` — button + interim caption | Interim styled differently from final, not by color alone |
| 4.6 | Auto-translate on finalized segment | Speaking a sentence produces a translation with no extra tap |
| 4.7 | Permission denial handling (E-2, E-3) | Denying shows the documented message, manual input expands |
| 4.8 | Auto-restart on silence (E-7, E-8) | Long pauses don't end the session; 5 empty restarts pause it |
| 4.9 | Request race handling (E-17) | Rapid speech never shows a stale translation |
| 4.10 | 500-character truncation (E-11) | Long input is capped with a note |

**Stage 4 gate:** tap listen, speak three English sentences with pauses, and get three correct Bangla translations without touching the screen.

Commit: `feat(frontend): live speech capture`

---

## Stage 5 — Voice output + transcript (3 sessions)

| # | Task | Done when |
|---|---|---|
| 5.1 | `src/hooks/useSpeak.js` wrapping speech synthesis | Translation is spoken |
| 5.2 | Voice selection by target language with fallback chain | Bangla uses a Bangla voice where one exists |
| 5.3 | No-voice-available handling (E-21) | Button disabled with an explanation, not silently broken |
| 5.4 | Cancel in-progress speech on new translation (E-22) | No overlapping voices |
| 5.5 | Autoplay toggle, on by default | Toggle persists to `localStorage` |
| 5.6 | `src/components/Transcript.jsx` | Entries append, newest scrolled into view |
| 5.7 | Empty state copy | Matches `prd.md` §7 |
| 5.8 | Clear control with confirmation | Confirms before wiping |

**Stage 5 gate:** a full two-way exchange — speak English, hear Bangla, swap, speak Bangla, hear English — with everything logged in the transcript.

Commit: `feat(frontend): speech playback and session transcript`

---

## Stage 6 — Polish and accessibility (3 sessions)

| # | Task | Done when |
|---|---|---|
| 6.1 | Load a Bangla webfont explicitly (E-23) | Bangla renders on a machine with no Bangla system font |
| 6.2 | Mobile layout, portrait | Usable on a phone; listen button thumb-reachable |
| 6.3 | Keyboard navigation with visible focus rings | Tab reaches every control |
| 6.4 | ARIA live region for captions and translations | Screen reader announces new translations |
| 6.5 | `prefers-reduced-motion` respected | Pulse animation disabled when set |
| 6.6 | Bangla body text ≥ 18px | Verified visually |
| 6.7 | Walk every edge case in `prd.md` §5 | Each one produces its documented behavior |

**Stage 6 gate:** every row in `prd.md` §5 has been triggered by hand and behaves as written.

Commit: `polish: accessibility and edge case handling`

---

## Stage 7 — Ship (2 sessions)

| # | Task | Done when |
|---|---|---|
| 7.1 | `README.md` — what it is, setup, run, env vars, limitations | A classmate can run it from the README alone |
| 7.2 | `.env.example` committed, `.env` gitignored | No secret in git history — check the whole history |
| 7.3 | Deploy the backend to Render | Public HTTPS URL responds to `/api/health` |
| 7.4 | Deploy the frontend to Vercel with `VITE_API_BASE_URL` set | Public URL loads |
| 7.5 | Backend CORS updated to allow the Vercel origin | No CORS errors in the browser console |
| 7.6 | End-to-end test on the deployed site, on a phone | Voice translation works over HTTPS |
| 7.7 | Update `decisions.md` with everything that changed during the build | Log is current |

**Stage 7 gate:** a public URL where voice translation works on a phone.

Commit: `chore: deploy v0.1`
Tag: `v0.1.0`

---

## Total: ~24 sessions

At an hour a day, roughly five weeks with slack. Stages 1 and 4 will overrun — that's where the real learning is.

---

## Rules for the whole build

1. **One task per Claude Code session.** Not one stage. One row from a table.
2. **Commit after every green acceptance check.** Message format: `feat(scope): what changed`.
3. **Read every file that gets created.** If you can't explain it, ask for a walkthrough before moving on.
4. **Never move past a red gate.** A broken Stage 1 makes Stage 4 undebuggable.
5. **Log surprises in `decisions.md` the day they happen.** You will not remember why in October.
6. **Test the backend through `/docs` before touching the frontend.** Isolating which half is broken is most of debugging.

---

## After v0.1

Do not start these until v0.1 is deployed and tagged.

**v0.2 — Persistence and accounts**
SQLite + SQLModel, the `SqlSessionRepository` implementation, JWT auth in `get_current_user()`, session creation, clinical history list and detail, search and filter.

**v0.3 — Clinical layer**
Clinical context selector wired to a prompt-based LLM provider, session summaries in SOAP format, doctor approval, PDF export, feedback and correction capture.

**v0.4 — Server-side ASR**
Whisper behind a WebSocket endpoint, `useSpeech.js` swapped to stream audio, browser ASR kept as a fallback. Cross-browser support arrives here.

**v1.0 — TorongoNet**
Dataset collection, NLLB fine-tuning, the model exposed as a `TranslationProvider`, WER/BLEU/TER evaluation, dialect identification, safety flagging.

Each of these fits the seams already in the code. That is the point of v0.1.
