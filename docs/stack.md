# stack.md

**Torongo v0.1 — Locked Technology Decisions**
Last updated: 2026-07-25

These are decided. Do not relitigate them mid-build. If something genuinely has to change, record it in `decisions.md` with the reason.

---

## 1. Summary table

| Layer | Choice | Version | Locked |
|---|---|---|---|
| Frontend framework | React | 18.x | ✅ |
| Build tool | Vite | 5.x | ✅ |
| Language (frontend) | JavaScript (not TypeScript) | ES2022 | ✅ |
| Styling | Tailwind CSS | 3.x | ✅ |
| Frontend state | React hooks only | — | ✅ |
| HTTP client | `fetch` | native | ✅ |
| Speech-to-text | Web Speech API (browser) | — | ✅ |
| Text-to-speech | Web Speech Synthesis (browser) | — | ✅ |
| Backend framework | FastAPI | 0.115+ | ✅ |
| Language (backend) | Python | 3.11+ | ✅ |
| Server | Uvicorn | latest | ✅ |
| Validation | Pydantic | v2 | ✅ |
| Translation provider | Google Cloud Translation v2 | REST | ✅ |
| Dependency management | `pip` + `requirements.txt` | — | ✅ |
| Database | **None in v0.1** | — | ✅ |
| Auth | **None in v0.1** | — | ✅ |
| Version control | Git + GitHub | — | ✅ |

## 2. Repository layout

```
torongo/
├── CLAUDE.md                    # instructions for Claude Code
├── README.md                    # setup + run instructions
├── .gitignore
├── docs/
│   ├── scope.md
│   ├── prd.md
│   ├── stack.md
│   ├── schema.md
│   ├── build-plan.md
│   └── decisions.md
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── .env                     # gitignored
│   └── app/
│       ├── main.py              # FastAPI app, CORS, router mounting
│       ├── config.py            # env var loading via pydantic-settings
│       ├── models.py            # pydantic request/response schemas
│       ├── deps.py              # dependencies (incl. get_current_user)
│       ├── routers/
│       │   ├── health.py
│       │   └── translate.py
│       └── services/
│           ├── base.py          # TranslationProvider protocol
│           ├── stub.py          # fake provider, no network
│           ├── google.py        # Google Translate v2
│           ├── registry.py      # picks provider from config
│           └── repository.py    # SessionRepository protocol + in-memory impl
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── api/
        │   └── client.js        # every fetch call lives here
        ├── hooks/
        │   ├── useSpeech.js     # ASR — swappable seam
        │   ├── useSpeak.js      # TTS
        │   └── useTranslate.js  # calls the API client
        ├── components/
        │   ├── Header.jsx
        │   ├── LanguageBar.jsx
        │   ├── CapturePanel.jsx
        │   ├── OutputPanel.jsx
        │   ├── ManualInput.jsx
        │   ├── Transcript.jsx
        │   └── StatusDot.jsx
        └── lib/
            └── languages.js     # language code constants
```

## 3. Why each choice

### React + Vite, not Next.js

The SRS names Next.js. v0.1 has one page and no server-side rendering need. Next.js would add a routing system, a server runtime, and a build model to learn — all cost, no benefit at this size. Vite gives instant hot reload and a two-line config. Migrating to Next.js later is mostly moving files.

### JavaScript, not TypeScript

TypeScript is better engineering. It is also a second language to learn while already learning React, and every type error becomes a blocker. The API contract is documented in `schema.md` and enforced by Pydantic on the backend, which is where it actually matters. Revisit if the project grows past v0.2.

### Tailwind, not plain CSS or a component library

Utility classes keep styling in the same file as the markup, which drastically shortens the debug loop for a beginner. It also reinforces CSS fundamentals rather than hiding them — every Tailwind class maps to a real property. A component library like shadcn/ui would produce a nicer UI faster but teach less and add setup friction.

### React hooks only, no state library

There is one page and maybe eight pieces of state. Redux, Zustand, and TanStack Query all solve problems v0.1 does not have. When persistence and history arrive in v0.2, revisit TanStack Query for caching.

### Web Speech API, not Whisper

This is the biggest simplification in the whole plan, and it's worth being explicit about.

| | Browser Web Speech API | Whisper on the server |
|---|---|---|
| Setup | ~30 lines of JS | Audio capture, chunking, WebSocket server, model loading, GPU or slow CPU |
| Cost | Free | GPU hosting or high latency |
| Latency | Sub-second, streams natively | 1–3s per chunk |
| Bangla support | Yes (`bn-BD`) | Yes, weaker |
| Browser support | Chrome, Edge only | Any browser |
| Dialect support | None | Fine-tunable — the whole point of the thesis |

For v0.1 the browser wins on every axis that matters right now. The thesis work later needs Whisper, and that migration is contained: `useSpeech.js` keeps the same interface, and the audio goes to a new WebSocket endpoint instead of the browser engine. Nothing else in the app changes.

### Google Cloud Translation v2, not an LLM

Options considered: Google Translate, Microsoft Translator, DeepL, Gemini, Claude.

- **DeepL** — eliminated. No Bangla support.
- **Gemini / Claude** — good translation quality and can follow a "translate this as clinical language" instruction, but 2–5× the latency and non-deterministic output. Good candidate for the *summary* feature in v0.2.
- **Microsoft Translator** — viable alternative, 2M free characters per month. Keep as the backup if Google billing setup is a problem.
- **Google Cloud Translation v2** — chosen. Sub-second latency, a plain REST call with an API key (no SDK, no OAuth dance), reliable Bangla, and a free tier that comfortably covers a student project.

Provider choice is behind an interface, so switching is a config change plus one new file.

### No database in v0.1

Adding SQLite means models, migrations, session management, and a repository layer before a single translation appears on screen. v0.1's job is to prove the translation pipeline. The `SessionRepository` protocol exists from day one with an in-memory implementation, so v0.2 adds a second implementation rather than restructuring.

### No auth in v0.1

Auth is the hardest single piece for a beginner and gates nothing in the core flow. The `get_current_user()` dependency exists and returns a fixed anonymous user. Endpoints already declare `user = Depends(get_current_user)`. When JWT arrives, one function body changes.

## 4. The seams

Four places in the code exist purely to make later work cheap. They should be obvious in review.

**Seam 1 — `backend/app/services/base.py`**

```python
from typing import Protocol
from app.models import TranslationResult

class TranslationProvider(Protocol):
    name: str
    async def translate(
        self, text: str, source_lang: str, target_lang: str, context: str | None
    ) -> TranslationResult: ...
```

Routers depend on this protocol, never on Google. Swapping to a self-hosted TorongoNet means adding `services/torongonet.py` and changing one env var.

**Seam 2 — `backend/app/deps.py`**

```python
from pydantic import BaseModel

class CurrentUser(BaseModel):
    id: str
    role: str
    is_anonymous: bool

async def get_current_user() -> CurrentUser:
    # v0.1: everyone is the same anonymous operator.
    # v0.2: decode the JWT from the Authorization header.
    return CurrentUser(id="anonymous", role="operator", is_anonymous=True)
```

**Seam 3 — `backend/app/services/repository.py`**

A `SessionRepository` protocol with `create_session`, `add_transcript`, `list_sessions`. The v0.1 implementation is a dict. The v0.2 implementation is SQLModel. Callers never change.

**Seam 4 — `frontend/src/hooks/useSpeech.js`**

Returns a fixed shape regardless of where speech comes from:

```js
const {
  isListening, interimText, finalText,
  error, isSupported, start, stop
} = useSpeech({ lang: 'en-US' })
```

Whisper-over-WebSocket later returns the same shape. Components never learn which engine is running.

## 5. Environment variables

`backend/.env` — never committed. `backend/.env.example` is committed with placeholder values.

| Variable | Example | Purpose |
|---|---|---|
| `TRANSLATION_PROVIDER` | `google` | `stub` \| `google` \| `microsoft` |
| `GOOGLE_TRANSLATE_API_KEY` | `AIza...` | Google Cloud API key |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS allowlist, comma-separated |
| `REQUEST_TIMEOUT_SECONDS` | `15` | Upstream provider timeout |

`frontend/.env`:

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend address |

The API key lives on the backend only. The frontend never sees it and never calls the provider directly.

## 6. Ports

- Frontend dev server: `5173`
- Backend: `8000`
- Interactive API docs: `http://localhost:8000/docs`

## 7. Hosting (end of term)

| Piece | Target | Notes |
|---|---|---|
| Frontend | Vercel | Free, connects to GitHub, auto-deploys |
| Backend | Render free tier | Sleeps after inactivity — first request takes ~30s. Acceptable for a demo; mention it in the presentation. |

Both need HTTPS, which the Web Speech API requires anyway.

## 8. Explicitly rejected

| Rejected | Reason |
|---|---|
| Next.js | Unnecessary complexity for one page |
| TypeScript | Second language to learn simultaneously |
| Redux / Zustand | No state complexity to justify it |
| PostgreSQL | No database at all in v0.1 |
| Docker | Extra layer between the developer and their own code |
| WebSocket | Browser ASR already streams client-side |
| Whisper (now) | Deferred to the thesis phase |
| DeepL | No Bangla |
| shadcn/ui | Setup cost, and hides the CSS being learned |
| Monorepo tooling | Two folders is not a monorepo |
