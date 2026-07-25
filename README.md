# Torongo

Real-time English and Bangla translation for clinical consultations. A doctor speaks, sees a live caption of their own words, and the patient hears the sentence in their own language a moment later.

Course project for CSE309, Independent University Bangladesh.
By Syed Mehedi Hussain and Md Sakib Al Hasan.

> **v0.1 — walking skeleton.** One screen, one flow, no login, no database. This version proves the hardest end-to-end path works: voice in, text, translation, voice out. Everything else in the specification is built on top of that path.

![Screenshot placeholder — replace with a capture of the running app](docs/screenshot.png)

---

## Prerequisites

| Tool | Version | Check with |
|---|---|---|
| Python | 3.11 or newer | `python3 --version` |
| Node.js | 20 or newer | `node -v` |
| Git | any recent | `git --version` |

Developed and verified on Python 3.13.14, Node 20.20.1.

**Use Chrome or Edge.** Voice input relies on the Web Speech API, which Firefox does not implement. The app detects this, hides the microphone button, and opens the typing panel instead, so it stays fully usable — but you will not get voice.

**No API key is needed to run this.** The default provider needs no credentials. See [Translation providers](#translation-providers) below.

---

## Setup

Two terminals, one for each half. Start with the backend.

### 1. Backend

```bash
cd backend
python3 -m venv venv
```

Activate the virtual environment:

```bash
# macOS / Linux
source venv/bin/activate

# Windows (PowerShell)
venv\Scripts\Activate.ps1
```

Then install and configure:

```bash
pip install -r requirements.txt

cp .env.example .env        # Windows: copy .env.example .env

uvicorn app.main:app --reload
```

The API is now on **http://localhost:8000**, with interactive docs at **http://localhost:8000/docs**. That page is the fastest way to test the backend on its own, which is worth doing before blaming the frontend for anything.

Confirm it works:

```bash
curl http://localhost:8000/api/health
```

### 2. Frontend

In a **second terminal**, leaving the backend running:

```bash
cd frontend
npm install

cp .env.example .env        # Windows: copy .env.example .env

npm run dev
```

Open **http://localhost:5173**.

Type a sentence and press Translate, or press **Start listening** and speak.

---

## Translation providers

Set `TRANSLATION_PROVIDER` in `backend/.env`. Restart the backend after changing it.

| Value | Key needed | Quality | Use for |
|---|---|---|---|
| `stub` | no | none — echoes `[bn] <your text>` | Working offline, or on the UI without spending quota |
| `google_free` | no | real Google translation | **The default.** Development and demos |
| `mymemory` | no | poor — returned Romanised Bangla and even Hindi on common phrases | Demonstrating the provider seam only |
| `google` | yes | best | Deployment, and any measurement of translation quality |

The default is `google_free` so that a fresh clone translates correctly with no setup at all. It uses an undocumented Google endpoint with no service guarantee ([decisions.md](docs/decisions.md) D-017), so the deployed build should use `google` with a real key.

Whatever the provider, the backend checks that a translation is actually in the target script and marks it `needs_review` with a `low_confidence` risk flag when it is not, which the UI surfaces as a warning. That guard exists because MyMemory once returned Hindi for a Bangla request.

<details>
<summary>Getting a Google Cloud Translation key</summary>

1. [console.cloud.google.com](https://console.cloud.google.com) → create a project
2. Enable billing (required even for free-tier use; this volume will not be charged)
3. APIs & Services → Library → "Cloud Translation API" → Enable
4. APIs & Services → Credentials → Create credentials → API key
5. Restrict the key to the Cloud Translation API
6. Put it in `backend/.env` and set `TRANSLATION_PROVIDER=google`

</details>

---

## Environment variables

**`backend/.env`** — copied from `.env.example`, never committed.

| Variable | Default | Purpose |
|---|---|---|
| `TRANSLATION_PROVIDER` | `google_free` | `stub`, `google_free`, `mymemory`, or `google` |
| `GOOGLE_TRANSLATE_API_KEY` | empty | Only read when the provider is `google` |
| `TTS_PROVIDER` | `google_translate` | Serves `GET /api/speech`, used when the browser has no local voice |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS allowlist, comma-separated, no trailing slash |
| `REQUEST_TIMEOUT_SECONDS` | `15` | Upstream provider timeout |

**`frontend/.env`**

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Where the backend lives |

Both `.env` files are gitignored; the committed `.env.example` files carry placeholders only. The API key lives on the backend and is never sent to the browser — the frontend never talks to a translation provider directly.

Vite reads `.env` only at startup, so restart `npm run dev` after changing it.

---

## Architecture

Backend is FastAPI; frontend is React with Vite and Tailwind. No database and no authentication in v0.1, both deliberately ([decisions.md](docs/decisions.md) D-006, D-007).

Four **seams** exist purely so that deferred work stays cheap. Each is a place where a v0.1 placeholder is replaced later without restructuring anything around it.

| Seam | Where | What it isolates | Becomes |
|---|---|---|---|
| 1 | `backend/app/services/base.py` | The translation vendor. Routers depend on a `TranslationProvider` protocol, never on Google. | A self-trained model |
| 2 | `backend/app/deps.py` | Who is making the request. Endpoints already declare `Depends(get_current_user)`; it returns a fixed anonymous operator. | JWT authentication |
| 3 | `backend/app/services/repository.py` | Storage. A `SessionRepository` protocol with an in-memory implementation that nothing calls yet. | SQL persistence |
| 4 | `frontend/src/hooks/useSpeech.js` | Where speech comes from. The only file touching the browser speech API. | Whisper over WebSocket |

Seam 1 has already been exercised: adding the Google and MyMemory providers took one new file each plus two lines in `registry.py`, with no change to any router, model, or frontend component.

Two other rules worth knowing before editing:

- `frontend/src/api/client.js` is the only file that calls `fetch`.
- `frontend/src/lib/languages.js` is the only file where a BCP-47 tag like `en-US` may appear. Everywhere else uses the internal codes `en` and `bn`.

---

## Known limitations

Documented tradeoffs, not defects.

- **Chrome and Edge only for voice.** The Web Speech API is absent in Firefox and partial in Safari. Detected at runtime, with the typing fallback opened automatically.
- **Requires an internet connection.** Both speech recognition and translation are cloud calls.
- **Bangla text-to-speech depends on the operating system.** Android and Windows usually ship a Bangla voice; many Linux installs and older iOS builds do not. Where no local voice exists the app falls back to server-side speech via `GET /api/speech` ([decisions.md](docs/decisions.md) D-016). The development TTS provider is an undocumented Google endpoint with no service guarantee; the deployed build should use Google Cloud Text-to-Speech.
- **General-domain translation.** No medical vocabulary tuning. This is precisely the gap the later thesis work aims to close, so it is a finding rather than a failure.
- **Standard Bangla only.** No Sylheti or Chatgaiya support. The response envelope already carries a `detected_dialect` field for when that arrives.
- **The transcript is lost on refresh.** It lives in React state only. The empty-state copy says so.

**Privacy note worth stating explicitly:** in v0.1 audio never leaves the browser. Recognition runs client-side and only text is sent to the server, so "no raw audio is stored" is true by construction rather than by policy ([decisions.md](docs/decisions.md) D-012).

---

## Troubleshooting

| Symptom | Check |
|---|---|
| `Failed to fetch` in the browser | Is the backend running? Is `VITE_API_BASE_URL` correct? Vite only reads `.env` at startup — restart it. |
| CORS error in the console | `ALLOWED_ORIGINS` must match the frontend origin exactly, with no trailing slash. Restart the backend after changing it. |
| Translation returns `[bn] <your text>` | `TRANSLATION_PROVIDER` is still `stub`. Set it to `google_free` or `google` and restart. |
| Translation shows a "check this" warning | The output was not in the target script. Usually a weak provider; switch to `google_free` or `google`. |
| Voice button does nothing | Chrome or Edge? Microphone permission granted? Open **http://localhost:5173/mic-test.html**, which drives the speech API directly and logs every event. |
| Bangla shows as boxes | The Bengali webfont failed to load. Check the network tab. |
| Backend will not start | Virtual environment activated? Running from inside `backend/`? |
| 503 from translate | With `google`: key set, API enabled, billing on. The server log holds the real reason; the response deliberately does not. |

---

## Documentation

The full specification lives in [`docs/`](docs/):

| File | What it covers |
|---|---|
| [scope.md](docs/scope.md) | What v0.1 is, what is deferred and why, success criteria |
| [prd.md](docs/prd.md) | Screen, features, all 23 edge cases, fixed copy |
| [stack.md](docs/stack.md) | Technology choices with reasoning, folder layout, the seams |
| [schema.md](docs/schema.md) | The frozen API contract, error codes, future database design |
| [build-plan.md](docs/build-plan.md) | Ordered tasks with acceptance gates |
| [decisions.md](docs/decisions.md) | Why each non-obvious choice was made |

Start with `scope.md`.
