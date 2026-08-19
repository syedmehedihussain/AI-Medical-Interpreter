# schema.md

**AI Medical Interpreter — Data Shapes, API Contracts, and Access Rules**
Last updated: 2026-07-20

v0.1 has no database. It still has data shapes, and those shapes are the thing that must not change later. This document defines them, then defines the tables they will eventually be stored in.

**Rule:** the API contract in section 2 is frozen. Adding a database in v0.2 must not change any request or response shape. If it would, the shape was designed wrong.

---

## 1. Language codes

Two vocabularies exist. Do not mix them.

**Internal codes** — used in API requests, responses, and storage:

| Code | Language |
|---|---|
| `en` | English |
| `bn` | Standard Bangla |
| `bn-syl` | Sylheti *(reserved, unused in v0.1)* |
| `bn-ctg` | Chatgaiya / Chittagonian *(reserved)* |
| `bn-mix` | Mixed Bangla *(reserved)* |
| `unknown` | Undetermined *(reserved)* |

**BCP-47 tags** — used only by browser speech APIs, mapped at the edge in `frontend/src/lib/languages.js`:

| Internal | Speech recognition | Speech synthesis |
|---|---|---|
| `en` | `en-US` | `en-US` |
| `bn` | `bn-BD` | `bn-BD`, falling back to `bn-IN`, then `bn` |

Nothing outside `languages.js` should ever contain the string `en-US`.

## 2. API contracts

Base URL: `http://localhost:8000` in development.
All bodies are JSON. All responses use the envelope in 2.1.

### 2.1 Response envelope

Every successful response:

```json
{
  "data": { },
  "meta": {
    "request_id": "b3f2a1c8",
    "provider": "google",
    "latency_ms": 412
  }
}
```

Every error response:

```json
{
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Translation service unavailable.",
    "retryable": true
  },
  "meta": {
    "request_id": "b3f2a1c8"
  }
}
```

The `message` field is written for the end user and is safe to display verbatim. Internal details — stack traces, provider errors, key problems — go to server logs only, never into the response.

**Error codes:**

| Code | HTTP | Retryable | When |
|---|---|---|---|
| `VALIDATION_ERROR` | 422 | no | Bad or missing fields |
| `EMPTY_INPUT` | 400 | no | Text is blank after trimming |
| `SAME_LANGUAGE` | 400 | no | Source equals target |
| `UNSUPPORTED_LANGUAGE` | 400 | no | Language code not enabled |
| `TEXT_TOO_LONG` | 400 | no | Over 500 characters |
| `PROVIDER_UNAVAILABLE` | 503 | yes | Upstream down, key missing or invalid |
| `PROVIDER_RATE_LIMITED` | 429 | yes | Upstream quota hit |
| `PROVIDER_TIMEOUT` | 504 | yes | Upstream exceeded the timeout |
| `INTERNAL_ERROR` | 500 | yes | Anything unhandled |

### 2.2 `GET /api/health`

No auth. Used by the frontend on load to set the status indicator.

Response `200`:

```json
{
  "data": {
    "status": "ok",
    "provider": "google",
    "provider_ready": true,
    "version": "0.1.0"
  },
  "meta": { "request_id": "a1b2c3d4" }
}
```

`provider_ready` is `false` when the API key is missing. The app still loads and shows an Offline status rather than crashing.

### 2.3 `GET /api/languages`

No auth. Lets the frontend build its selectors from the server rather than hardcoding, so adding a dialect later is a backend-only change.

Response `200`:

```json
{
  "data": {
    "languages": [
      { "code": "en", "label": "English", "native_label": "English", "speech_supported": true },
      { "code": "bn", "label": "Bangla",  "native_label": "বাংলা",   "speech_supported": true }
    ]
  },
  "meta": { "request_id": "a1b2c3d4" }
}
```

### 2.4 `POST /api/translate/text`

The one endpoint that matters. Maps to SRS FR-4.

**Request:**

```json
{
  "text": "How long have you had this pain?",
  "source_lang": "en",
  "target_lang": "bn",
  "context": "general",
  "session_id": null
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | yes | 1–500 chars after trimming |
| `source_lang` | string | yes | Internal code |
| `target_lang` | string | yes | Internal code, must differ from source |
| `context` | string | no | Clinical context. **Accepted and validated in v0.1, but ignored by the provider.** Present so the field exists before there's a model that uses it. Defaults to `"general"`. |
| `session_id` | string | no | Always `null` in v0.1. Reserved for v0.2 persistence. |

**Response `200`:**

```json
{
  "data": {
    "source_text": "How long have you had this pain?",
    "translated_text": "আপনার এই ব্যথা কতদিন ধরে?",
    "source_lang": "en",
    "target_lang": "bn",
    "detected_dialect": null,
    "confidence": null,
    "risk_flags": [],
    "needs_review": false,
    "context": "general"
  },
  "meta": {
    "request_id": "b3f2a1c8",
    "provider": "google",
    "latency_ms": 412
  }
}
```

**On the four fields that are always empty in v0.1** — `detected_dialect`, `confidence`, `risk_flags`, `needs_review`:

These are the whole reason this contract is worth writing down. A general translation API returns none of them. the fine-tuned medical model will return all of them. By including them now as `null` / `[]` / `false`:

- Frontend components already handle their absence gracefully
- Adding the real model changes no shape, no component, no type
- The presentation can point at the contract and say the clinical safety layer has a defined place to plug into

`risk_flags`, when populated later, will hold objects of the form:

```json
{ "type": "dosage", "span": [12, 28], "severity": "high", "note": "Verify dosage" }
```

with `type` drawn from: `dosage`, `allergy`, `emergency_symptom`, `pregnancy`, `unclear_drug_name`, `low_confidence`, `contradiction` (SRS 6.6).

**Errors:** any code from 2.1.

### 2.5 Endpoints reserved but not implemented

Listed so URL design stays coherent. Returning 404 today is correct.

| Method | Path | Arrives in |
|---|---|---|
| `POST` | `/api/auth/login` | v0.2 |
| `GET` | `/api/auth/me` | v0.2 |
| `POST` | `/api/sessions` | v0.2 |
| `GET` | `/api/sessions` | v0.2 |
| `GET` | `/api/sessions/{id}` | v0.2 |
| `POST` | `/api/sessions/{id}/summary` | v0.3 |
| `GET` | `/api/sessions/{id}/export-pdf` | v0.3 |
| `POST` | `/api/feedback` | v0.3 |
| `WS` | `/ws/live-speech` | v0.4 |

## 3. In-memory shapes (v0.1)

### Backend

`SessionRepository` protocol, in-memory implementation. Nothing calls it in v0.1, but it exists so the interface is real:

```python
class SessionRepository(Protocol):
    async def create_session(self, user_id: str, meta: dict) -> str: ...
    async def add_transcript(self, session_id: str, entry: dict) -> None: ...
    async def get_session(self, session_id: str) -> dict | None: ...
    async def list_sessions(self, user_id: str, limit: int) -> list[dict]: ...
```

### Frontend

Transcript entries in React state:

```js
{
  id: "1721476823-3",           // timestamp + counter
  sourceText: "...",
  translatedText: "...",
  sourceLang: "en",
  targetLang: "bn",
  timestamp: "2026-07-20T10:42:03.000Z",
  inputMode: "voice",           // "voice" | "typed"
  confidence: null,
  riskFlags: []
}
```

Field names match the API response, camelCased. When persistence arrives, this object serializes straight into a transcript row.

## 4. Database design (v0.2 onward)

Not built yet. Documented so the shapes above are known to map onto something real.

Trimmed from the SRS's seven tables to four for v0.2. `clinical_contexts` becomes an enum until it needs admin management; `audit_logs` and `feedback` wait for v0.3.

### 4.1 `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `full_name` | VARCHAR(120) | |
| `email` | VARCHAR(255) UNIQUE | |
| `password_hash` | VARCHAR(255) | bcrypt |
| `role` | VARCHAR(20) | `doctor`, `nurse`, `pharmacist`, `interpreter`, `admin`, `researcher` |
| `preferred_source_lang` | VARCHAR(10) | |
| `preferred_target_lang` | VARCHAR(10) | |
| `status` | VARCHAR(20) | `active`, `suspended`, `deleted` |
| `created_at` | TIMESTAMPTZ | |

### 4.2 `sessions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `patient_code` | VARCHAR(50) | Anonymous identifier — **never a patient name** |
| `source_lang` | VARCHAR(10) | |
| `target_lang` | VARCHAR(10) | |
| `detected_dialect` | VARCHAR(10) | nullable |
| `context` | VARCHAR(40) | |
| `mode` | VARCHAR(20) | `text`, `live_speech`, `mixed` |
| `consent_given` | BOOLEAN | default `false` |
| `started_at` / `ended_at` | TIMESTAMPTZ | |
| `status` | VARCHAR(20) | `active`, `completed`, `archived`, `deleted` |

Indexes: `(user_id, started_at DESC)`, `(patient_code)`.

### 4.3 `transcripts`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `session_id` | UUID FK → sessions, `ON DELETE CASCADE` | |
| `speaker_type` | VARCHAR(20) | `doctor`, `patient`, `nurse` |
| `sequence` | INTEGER | Ordering within the session |
| `source_text` | TEXT | |
| `translated_text` | TEXT | |
| `source_lang` / `target_lang` | VARCHAR(10) | |
| `confidence` | NUMERIC(4,3) | nullable |
| `risk_flags` | JSONB | default `[]` |
| `input_mode` | VARCHAR(10) | `voice`, `typed` |
| `edited_by_human` | BOOLEAN | default `false` |
| `created_at` | TIMESTAMPTZ | |

Index: `(session_id, sequence)`.

**No `raw_audio_url` column.** SRS NFR-3.3 requires raw audio deletion after transcription. Not storing a path at all is the simplest way to guarantee it. Add it only if a consent-gated retention feature is actually built.

### 4.4 `summaries`

One row per session. Fields follow SRS 7.6: `chief_complaint`, `symptoms` (JSONB), `medication_notes` (JSONB), `follow_up_plan`, the four SOAP fields, `ai_summary`, `doctor_approved`, `approved_by`, `approved_at`.

`doctor_approved` defaults to `false` and nothing may be exported while it is false (SRS 15.4).

## 5. Access rules

None of these apply in v0.1 — there is no data and no user. They are written now so v0.2 implements them from the start rather than retrofitting.

### 5.1 Ownership

- A user may read and write only sessions where `sessions.user_id` equals their own id.
- Enforced in the repository layer, not the router. Every query takes a `user_id` and filters on it. A router must not be able to fetch someone else's session by forgetting a check.
- `admin` may read any session's metadata but **not** transcript content. Administration is user and system management, not clinical reading.
- `researcher` may read only anonymized aggregates through a dedicated research query path. No access to `sessions` or `transcripts` directly.

### 5.2 Role matrix (v0.2+)

| Action | doctor | nurse | pharmacist | interpreter | admin | researcher |
|---|---|---|---|---|---|---|
| Translate | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create session | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Read own sessions | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Read others' sessions | ❌ | ❌ | ❌ | ❌ | metadata only | ❌ |
| Generate summary | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve summary | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export PDF | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Submit correction | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage users | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| View aggregate metrics | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

### 5.3 Privacy invariants

Hold from v0.1 forward, including with no database:

1. **No patient names anywhere.** Only `patient_code`. Enforced by never providing a name field.
2. **No raw audio persisted.** v0.1 never sends audio to the backend at all — recognition happens in the browser and only text leaves the device. Note this in the presentation; it is a genuine privacy property, not an accident.
3. **API keys server-side only.** The frontend never holds a provider credential.
4. **No identifiers in URLs.** Session data is fetched by id in a path segment, never with patient information in a query string (SRS NFR-2.5).
5. **Errors do not leak internals.** Provider messages are logged, not returned.
6. **Nothing is stored without consent.** v0.1 stores nothing, so this is satisfied trivially. v0.2 gates writes on `consent_given`.

### 5.4 Validation rules

Enforced by Pydantic on every request:

| Rule | Detail |
|---|---|
| `text` length | 1–500 characters after `.strip()` |
| `text` not blank | Whitespace-only rejected |
| `source_lang` / `target_lang` | Must be in the enabled set |
| Source ≠ target | 400 `SAME_LANGUAGE` |
| `context` | Must be a known value; defaults to `general` |
| Unknown fields | Rejected — Pydantic `extra="forbid"` |

Client-side validation mirrors this for responsiveness. Server-side validation is the one that counts.
