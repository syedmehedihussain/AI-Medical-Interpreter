# AI Medical Interpreter (Mita)

## Software Requirements Specification

**Version 1.0** · Status: Final Draft, submitted for evaluation

Prepared by Syed Mehedi Hussain, Md Sakib Al Hasan
Development Team, CSE309 Software Engineering
Independent University, Bangladesh (IUB)
21 August 2026

## Table of Contents

**Part A. Requirements Elicitation**

A.1 Elicitation Techniques

A.2 Elicitation Preparation

A.3 Conducting the Elicitation (Introduction, Body, Close, Follow-up)

A.4 Analysis of Elicitation Results

A.5 Difficulties of Requirements Elicitation

**Part B. Requirements Analysis and Negotiation**

B.1 Requirements Examined Against SMART Objectives

B.2 Prioritisation by MoSCoW

B.3 Classification: Functional and Non-Functional Requirements

**Part C. Software Requirements Specification**

**1. Introduction**

1.1 Purpose

1.2 Document Conventions

1.3 Intended Audience and Reading Suggestions

1.4 Product Scope

1.5 References

**2. Overall Description**

2.1 Product Perspective

2.2 Product Functions

2.3 User Classes and Characteristics

2.4 Operating Environment

2.5 Design and Implementation Constraints

2.6 User Documentation

2.7 Assumptions and Dependencies

**3. External Interface Requirements**

3.1 User Interfaces

3.2 Hardware Interfaces

3.3 Software Interfaces

3.4 Communications Interfaces

**4. Domain Model**

**5. System Features (Use Cases)**

5.1 Use Case: Translate spoken speech

5.2 Use Case: Translate typed text

5.3 Use Case: Switch translation engine

5.4 Use Case: Confirm medical domain

**6. Other Nonfunctional Requirements**

6.1 Performance Requirements

6.2 Safety Requirements

6.3 Security Requirements

6.4 Software Quality Attributes

**7. Other Requirements**

7.1 Monitoring Strategy

7.2 Risk Management

7.3 Change Management Process

**Appendix A. Glossary**

**Appendix B. Analysis Models**

**Appendix C. Interface Examples**

**Appendix D. To Be Determined List**

## Revision History

| Name | Date | Reason For Changes | Version | Date of Approval |
| --- | --- | --- | --- | --- |
| Syed Mehedi Hussain, Md Sakib Al Hasan | 18 Aug 2026 | First working draft, structured around the sample template plus the elicitation and analysis sections required by the course | 0.1 | - |
| Syed Mehedi Hussain, Md Sakib Al Hasan | 20 Aug 2026 | Filled in every section against the finished system: both the deployed build and the local build with the fine-tuned engine, medication and summary services | 0.9 | - |
| Syed Mehedi Hussain, Md Sakib Al Hasan | 21 Aug 2026 | Final read-through before Turnitin submission; tightened language, corrected a few figures, confirmed FR/NFR numbering against the code | 1.0 | pending |

## Part A. Requirements Elicitation

This part records how we actually gathered what the interpreter needed to do, before a single line of the app existed. We kept it honest: two students, a handful of willing interviewees, and about three weeks of evenings. Nothing here is retrofitted after the build — the notes below are the ones we worked from.

### A.1 Elicitation Techniques

We leaned on four techniques, mostly because no single one felt trustworthy on its own — an interview can be led by the interviewer, a competitor scan can miss local context, and a brainstorm can run away with itself. Using more than one let us catch where they disagreed.

| ID | Technique | Why it was chosen | How it was applied |
| --- | --- | --- | --- |
| E-1 | Stakeholder interviews | Gives direct, first-hand access to real needs rather than our own assumptions | Semi-structured conversations with medical students and a general practitioner about what actually breaks down at the bedside when languages don't match |
| E-2 | Document and competitor analysis | Cheap way to learn from products already in the market before repeating their mistakes | Looked at App Store medical interpreter apps (Aida, among others) and general clinical-translation guidance to see what features were table stakes and where people complained |
| E-3 | Observation | Reveals needs people don't think to mention when just asked | Watched a doctor and a Bangla-only patient work through an ad-hoc, human-interpreter conversation, and timed how much got lost or delayed |
| E-4 | Brainstorming | Fast way to turn scattered observations into a short list of candidate features | Two team sessions where we wrote every idea on a shared doc, then ranked by clinical value against how hard it would be to build in one semester |

### A.2 Elicitation Preparation

Before we reached out to anyone, we did the following:

1. Stakeholder identification. Doctors and clinicians, Bangla-only patients (including regional speakers of Sylheti and Chittagonian), medical students, and ourselves as the development and evaluation team.

2. Objective definition. Pin down the core problem — the language gap at the bedside slows and distorts care — and the scope: English and Bangla, speech and text, real time.

3. Question guide. A short set of open questions: what goes wrong today when a patient doesn't share the doctor's language? What must never be mistranslated? How fast is fast enough? Where would you simply not trust an automatic translator?

4. Logistics. We scheduled sessions in advance, prepared a short consent and note-taking sheet, and split roles — one of us interviewed while the other took notes.

5. Ethical care. No real patient data was ever collected. Every scenario discussed was hypothetical, and nothing personal or clinical was written down.

### A.3 Conducting the Elicitation

Every session followed roughly the same shape, even when the conversation itself wandered.

#### Introduction

We explained upfront that this was a student project to build a real-time medical interpreter, said how long it would take, made clear no personal data would be stored, and got verbal consent to take notes.

#### Body

We asked the open questions first, then followed whatever thread seemed to matter, with probing questions where an answer felt incomplete. A few themes kept coming back regardless of who we spoke to: speed matters more than perfect fluency; drug names, dosages, numbers and units have to survive translation exactly; the clinician wants to stay in control and be warned when a translation looks doubtful; and the tool has to run on whatever phone or laptop is already in the room.

#### Close

We summarised what we'd heard back to the stakeholder so they could correct us, then asked a catch-all question — anything we didn't ask that matters?

#### Follow-up

Notes were written up the same day or the next, ambiguous points were sent back for confirmation over message, and every confirmed need was logged as a candidate requirement with a note on where it came from.

### A.4 Analysis of Elicitation Results

Once the raw notes were consolidated and the duplicates removed, they grouped fairly cleanly into themes, and each theme pointed at one or more requirements we could trace back to its source.

| Theme from elicitation | Derived requirement(s) |
| --- | --- |
| Language gap slows care | Real-time two-way EN↔BN translation (FR-1, FR-2) |
| Hands are usually busy with the patient | Voice input and spoken output, not typing alone (FR-1, FR-6) |
| Rooms are noisy, voice doesn't always work | Typed input as an equal path, not a fallback bolted on afterward (FR-3) |
| Clinical terms have to stay exact | Preserve drug names, dosages, numbers, units (FR-4) |
| Clinician has to stay in control | Flag doubtful translations for review; confirm the domain before it's used (FR-5, FR-9) |
| Trust and privacy came up unprompted | Store nothing; the transcript stays on the device (NFR-Security) |
| Has to run on ordinary devices | Browser-based, nothing to install, works on phone and laptop (NFR-Portability) |
| “Our own model” as an academic goal | A team-built translation engine, selectable next to the cloud model (FR-8) |

### A.5 Difficulties of Requirements Elicitation

Limited access to practising clinicians. We only had short windows of time with actual doctors, so some needs came from medical students and published clinical-practice notes instead.

Bilingual medical terminology. Deciding what “correct” looks like for a clinical phrase in Bangla took more care than we expected, especially for drug names and for regional dialects (Sylheti, Chittagonian) that diverge from standard Bangla.

Balancing speed against accuracy. Everyone wanted both. We had to negotiate a latency target that was realistic for us to hit rather than an ideal one nobody could deliver in a semester.

Scope creep. Saved patient histories and support for more languages both came up more than once. We deferred both to keep the first version focused and safe.

No real patient data. For privacy and ethics we couldn't test on real consultations, so evaluation used representative sample sentences instead.

## Part B. Requirements Analysis and Negotiation

### B.1 Requirements Examined Against SMART Objectives

We checked each core requirement against being Specific, Measurable, Achievable, Relevant, and Time-bound before it went any further.

| Req | Specific | Measurable | Achievable | Relevant | Time-bound |
| --- | --- | --- | --- | --- | --- |
| Real-time translation | Translate one EN↔BN utterance | Result back within ~5s on a warm backend | Yes — cloud model plus the browser speech API | Core to the language-gap problem | Met in the v1.0 demo build |
| Preserve clinical terms | Keep drug names, dosages, numbers, units unchanged | Checked against a fixed set of clinical test sentences | Yes — medical-aware prompting plus a script/safety check | Prevents dangerous errors | Met in v1.0 |
| Flag doubtful output | Mark wrong-language or suspect output for review | Boolean needs_review on every result | Yes — server-side quality check on every response | Keeps the clinician in control | Met in v1.0 |
| Own translation engine | Offer a team-built model beside the cloud model | User can switch provider and see which one is active | Yes — provider seam plus a hosted fine-tuned model | Academic goal and a vendor-free option | Integrated for the demo |
| Store nothing server-side | No audio or transcript persisted on the server | No database; transcript clears on refresh | Yes — stateless by design | Trust and privacy | Met in v1.0 |

### B.2 Prioritisation by MoSCoW

| Priority | Requirements |
| --- | --- |
| Must have | Real-time EN↔BN translation (voice and text); spoken output; preserve clinical terms; flag doubtful translations; browser-based with nothing to install; store nothing server-side |
| Should have | Switch between the cloud model and our own model; on-device session transcript; medical-domain suggestion with clinician confirmation |
| Could have | Regional dialect handling (Sylheti, Chittagonian) on input; saved session summaries; additional language pairs |
| Won’t have (this version) | User accounts and authentication; persistent server-side storage of consultations; offline operation |

### B.3 Classification: Functional and Non-Functional Requirements

#### Functional Requirements (what the system does)

| ID | Requirement |
| --- | --- |
| FR-1 | The system shall capture spoken input in the selected source language and transcribe it to text. |
| FR-2 | The system shall translate the text between English and Bangla in the chosen direction. |
| FR-3 | The system shall accept typed input as an equal alternative to speech and translate it the same way. |
| FR-4 | The system shall preserve drug names, dosages, numbers, and units exactly in the translation. |
| FR-5 | The system shall flag a translation as needing review when it detects wrong-language or otherwise suspect output, while still showing it. |
| FR-6 | The system shall play the translated text aloud in the target language, with an option to turn auto-play off. |
| FR-7 | The system shall let the user swap the translation direction at any time. |
| FR-8 | The system shall provide more than one translation engine — a cloud model and our own fine-tuned model — and let the user switch between them at run time. |
| FR-9 | The system shall detect a likely medical domain from the conversation and require the clinician to confirm it before it is used. |
| FR-10 | The system shall keep a session transcript on the device and clear it when the page is refreshed. |
| FR-11 | The system shall report a clear, actionable message on any failure (timeout, rate limit, unreachable service) and offer a retry where appropriate. |

#### Non-Functional Requirements (how well it does it)

| ID | Requirement |
| --- | --- |
| NFR-1 | Performance: a single translation shall normally complete within about 5 seconds on a warm backend. |
| NFR-2 | Usability: the tool shall be usable with no training, no sign-up, and no installation, on a phone or laptop browser. |
| NFR-3 | Safety: the system shall never present itself as diagnostic; it translates only, and warns on doubtful output. |
| NFR-4 | Security and privacy: no audio is stored and no transcript is persisted on the server; data stays on the user's device. |
| NFR-5 | Reliability: a failure of one translation engine shall not crash the app; the user can retry or switch engine. |
| NFR-6 | Portability: the frontend shall run in modern browsers; voice input needs Chrome or Edge, with typing as a fallback everywhere else. |
| NFR-7 | Maintainability: translation engines shall sit behind a single interface so adding one is a new module, not a change to the rest of the app. |
| NFR-8 | Accessibility: status shall never be conveyed by colour alone, and Bangla text shall use a legible font at an adequate size. |

## Part C. Software Requirements Specification

## 1. Introduction

### 1.1 Purpose

This document specifies the requirements for the AI Medical Interpreter, which we call Mita inside the app, version 1.0 — a real-time, speech-to-speech interpreter that translates a clinical conversation between a doctor and a patient across English and Bangla. It covers the whole product as we built it: the web application, its backend translation service, and the two translation engines it offers — a cloud model and our own fine-tuned model.

We should be upfront about one thing: we built and demoed two working copies of this system over the semester. The first is the deployed build (frontend on Vercel, backend on Render) that uses Google's translation API as the default engine. The second, which we ran locally for the final demonstration, adds our own fine-tuned engine, a medication-safety check, a domain-suggestion panel, and a consultation-summary feature on top of the same architecture. This SRS describes the complete system as it exists in the local build, since that is the version being demonstrated; where the deployed build is simpler, we say so.

### 1.2 Document Conventions

Requirements are labelled FR-n (functional) and NFR-n (non-functional). The word “shall” marks a mandatory requirement. Changes between revisions are tracked in the Revision History table above.

### 1.3 Intended Audience and Reading Suggestions

| ID | Stakeholder | Description |
| --- | --- | --- |
| S-1 | Course faculty / evaluator | Assesses this SRS and the demonstrated product against the course criteria. |
| S-2 | Development team | Builds and maintains the system against these requirements — that's us. |
| S-3 | Clinicians (users) | Doctors who would use the tool at the point of care. |
| S-4 | Patients (users) | Bangla-speaking patients whose speech gets translated. |
| S-5 | QA / test | Derives test cases from the functional and non-functional requirements. |

Suggested order: start with Sections 1 and 2 for context, read Part B for the prioritised requirements, then Section 5 for the detailed use cases, and Section 6 for quality and safety. Evaluators may prefer to read Parts A and B first, since that's where the marks for elicitation and analysis live.

### 1.4 Product Scope

The AI Medical Interpreter removes the language barrier between a doctor and a Bangla-speaking patient in real time, at the bedside, without waiting for a human interpreter. The user speaks or types in one language and gets the meaning in the other almost immediately, as both text and speech, with clinical terms preserved and doubtful output flagged rather than hidden. The goals we kept coming back to were: faster and clearer clinical communication; safety through preserving critical terms and keeping the clinician in control; privacy through storing nothing; and, as our own academic objective, a team-built translation model offered alongside a commercial cloud model. This version does not diagnose anything, does not have accounts, and does not keep long-term records of consultations.

### 1.5 References

1. IEEE Std 830-1998, Recommended Practice for Software Requirements Specifications.

2. Karl Wiegers, Software Requirements — the basis for the SRS template the course provided.

3. NLLB Team (Meta AI), No Language Left Behind: facebook/nllb-200-distilled-600M, huggingface.co/facebook/nllb-200-distilled-600M

4. Google AI Studio, Gemini API documentation, ai.google.dev

5. Our own project repository and companion engineering docs (scope.md, prd.md, stack.md, decisions.md, build-plan.md) for both the deployed and local builds.

## 2. Overall Description

### 2.1 Product Perspective

Mita is a new, self-contained product rather than a follow-on to something that existed before. It is a two-part web system: a browser frontend and a backend translation service. The backend never translates directly — it delegates to a translation provider sitting behind a single interface, so the engine underneath can change without touching the rest of the system. We provide two engines: a cloud model (Google Gemini) and our own fine-tuned model, which we named Torongo internally, built on a fine-tuned NLLB-200. Speech recognition uses the browser's built-in speech service; spoken output uses the browser's voices, with a server-side fallback for machines that don't have a Bangla voice installed. There is no database in this version.

### 2.2 Product Functions

At a high level, the product lets a user:

- choose the translation direction (English or Bangla as the spoken language)
- speak or type an utterance
- receive the translation as text and as speech, in near real time
- switch which translation engine is used (cloud model or our own model)
- see a likely medical domain suggested from the conversation and confirm it
- review a session transcript that stays on the device and clears on refresh
- see a clear warning when a translation looks doubtful or a service fails

### 2.3 User Classes and Characteristics

| ID | User class | Description |
| --- | --- | --- |
| U-1 | Clinician | A doctor or health worker who drives the session, picks the direction, and stays in control of what is used. Comfortable with a phone or laptop, not a language expert. |
| U-2 | Patient | A Bangla-speaking patient, possibly a regional-dialect speaker, who speaks and listens. May have limited literacy, which is why spoken output matters. |
| U-3 | Evaluator | Course faculty assessing the system, who interacts with every feature during the demo. |

### 2.4 Operating Environment

- Client: a modern web browser on a laptop or smartphone. Voice input needs Chrome or Edge (Web Speech API); typing works everywhere modern.
- Server: a Python FastAPI service running under Uvicorn. The deployed build runs on Render, with the frontend as a static build on Vercel; the local build runs both halves on a development machine.
- Our own model runs as a separate hosted inference service that the backend calls over HTTPS.
- An internet connection is required for the whole session — both speech recognition and translation are cloud calls.

### 2.5 Design and Implementation Constraints

- Frontend: React with Vite and Tailwind CSS.
- Backend: Python 3.12 with FastAPI, built around a TranslationProvider interface that every engine implements.
- The cloud engine is Google Gemini (we run gemini-3.5-flash-lite in the deployed build and gemini-3.7-flash locally, both chosen for low latency and generous free-tier limits, since translation doesn't need a heavyweight model).
- Our own engine, Torongo, is a fine-tuned NLLB-200 model hosted separately and called over HTTP.
- Speech recognition is limited to whatever the browser provides; regional dialects may come through transcribed as standard Bangla.
- No database and no authentication in this version — a deliberate choice, not an oversight.
- Cross-origin requests are restricted to the known frontend origin (CORS).
- All communication happens over HTTPS.

### 2.6 User Documentation

- An in-product Docs section and FAQ on the home page — how it works in four steps, supported languages, privacy, browser support.
- Companion technical guides we wrote for ourselves: model integration and model fine-tuning.
- This SRS and the project README.

### 2.7 Assumptions and Dependencies

We assumed users have a modern browser and a working microphone for voice, that the clinician (not the tool) makes clinical decisions, and that the sample clinical sentences we tested with fairly represent real use for evaluation purposes. The system depends on the Google Gemini API for the cloud engine, our own hosted inference service for Torongo, the browser's Web Speech API for recognition, and third-party open models (NLLB-200, plus open speech and voice models). If an external service is down, the affected engine reports itself as not-ready and the user can switch engine or retry.

## 3. External Interface Requirements

### 3.1 User Interfaces

There are two screens: a marketing home page (hero, use cases, docs, FAQ) and the Mita console. The console uses a three-panel clinical layout — session history and model information on the left; the live translation in the centre, with a direction toggle, a message card with a microphone, a translation card with a play control and a verified-or-needs-review indicator, and a conversation history; and a medical-domain panel on the right. Status is always shown by shape and label as well as colour, since colour alone isn't reliable for everyone. Bangla is rendered in a legible font at an enlarged size. Sample screens appear in Appendix C; detailed visual specifications live in a separate design note rather than in this document.

### 3.2 Hardware Interfaces

The system needs only a general-purpose client device — a laptop or smartphone with a microphone and speaker. No specialised hardware is involved anywhere.

### 3.3 Software Interfaces

- Google Gemini generative API (HTTPS, JSON) for the cloud translation engine.
- Our own model's inference service (HTTPS, JSON — text plus source and target language in, translated text out).
- The browser's Web Speech API for speech-to-text.
- The browser's Speech Synthesis API, with a server-side text-to-speech fallback, for speech output.

### 3.4 Communications Interfaces

All client-server traffic uses HTTPS with a JSON request and response envelope. The backend restricts allowed origins (CORS) to the deployed frontend. Each translation request carries the text, the source and target language, an optional context, and an optional provider selection; each response carries the translated text, a request id, the provider used, the latency, and safety flags.

## 4. Domain Model

The core entities and how they relate to one another:

- Session — an in-memory, device-local conversation. Holds many Turns. Never persisted anywhere.
- Turn — one exchange. Has source text, source language, translated text, target language, input mode (voice or typed), a timestamp, and safety flags (needs review, risk flags).
- Language — an internal code (en, bn) with display and speech attributes.
- TranslationProvider — an engine (the Gemini cloud model, or our Torongo model) that, given text and a language pair, returns a translated result.
- Domain — a medical-specialty hint (Pulmonology, for example) derived from a Turn's text, which the clinician confirms before it's used.

A Session has many Turns; each Turn is produced by exactly one TranslationProvider and belongs to one Language pair; a Turn may raise one Domain hint.

## 5. System Features (Use Cases)

### 5.1 Use Case: Translate spoken speech

|  |  |
| --- | --- |
| Brief Description | The clinician speaks an utterance and gets it back, in near real time, as text and speech in the other language. |
| Business Trigger | A doctor needs to say something to, or understand, a patient who doesn't share their language. |
| Preconditions | The app is open on the Mita console; a translation direction is selected; the browser has microphone permission; a translation engine is ready. |

**Basic Flow**

| Line | System Actor Action | System Response |
| --- | --- | --- |
| 1 | The clinician taps the microphone and speaks in the source language. | The system shows a live “listening” state and streams the recognised words as they form. |
| 2 | The clinician stops speaking. | The system finalises the recognised text and sends it to the active translation engine. |
| 3 | (wait) | The system shows a “translating” state, then displays the translation as text and, if auto-play is on, speaks it in the target language. |
| 4 | The clinician reads or plays the result. | The system records the exchange in the on-device session history and, if the output is doubtful, marks it “needs review.” |

Post Condition: the translation is shown and spoken; the turn is in the session history; no data is stored on the server.

Alternate Flow (A1) — Recognition produces no usable speech: if at line 2 the recogniser returns nothing, the system stays idle and prompts the clinician to try again or type instead. The use case restarts at line 1.

Alternate Flow (A2) — Engine unavailable or times out: if at line 3 the engine fails, the system shows a clear message (timeout, rate limit, or unreachable) and offers Retry, or the clinician switches engine (see 5.3). The use case restarts at line 2.

Business Rules: drug names, dosages, numbers, and units must appear unchanged in the output (FR-4). Non-Functional: normally completes within about 5s on a warm backend (NFR-1). Data Requirements: source and target language codes; recognised text up to 500 characters per segment.

### 5.2 Use Case: Translate typed text

|  |  |
| --- | --- |
| Brief Description | The user types an utterance instead of speaking and gets the same translation back. |
| Business Trigger | The room is noisy, voice isn't available, or the user just prefers typing. |
| Preconditions | The app is open; a direction is selected; a translation engine is ready. |

**Basic Flow**

| Line | System Actor Action | System Response |
| --- | --- | --- |
| 1 | The user types text in the message box and presses Enter. | The system sends the text to the active engine and shows a “translating” state. |
| 2 | (wait) | The system displays the translation and, if auto-play is on, speaks it. The exchange is added to the session history. |

Post Condition: same as 5.1. Alternate Flow: engine failure behaves the same as 5.1 A2. Business Rules and NFRs: same as 5.1.

### 5.3 Use Case: Switch translation engine

|  |  |
| --- | --- |
| Brief Description | The user switches the active translation engine between the cloud model and our own model. |
| Business Trigger | The user wants to compare engines, prefers the vendor-free option, or one engine is down. |
| Preconditions | The console is open; at least one engine is ready. |

**Basic Flow**

| Line | System Actor Action | System Response |
| --- | --- | --- |
| 1 | The user opens the model panel and selects Switch provider. | The system sets the chosen engine as active and updates the displayed model name. |
| 2 | The user performs a translation (5.1 or 5.2). | The system routes the request to the chosen engine and labels the result with the engine used. |

Post Condition: subsequent translations use the chosen engine until changed again. Alternate Flow: if the chosen engine isn't ready, the system keeps the previous engine and shows a “not ready” note. Business Rules: the same translation contract applies to every engine, so nothing else about the behaviour changes (NFR-7).

### 5.4 Use Case: Confirm medical domain

|  |  |
| --- | --- |
| Brief Description | The system suggests a likely medical specialty from the conversation, and the clinician confirms it before it's used. |
| Business Trigger | The conversation contains terms that point toward a specialty. |
| Preconditions | At least one translated turn exists. |

**Basic Flow**

| Line | System Actor Action | System Response |
| --- | --- | --- |
| 1 | (automatic) | The system highlights a suggested domain (Pulmonology, for example) with a confidence hint. |
| 2 | The clinician selects Confirm. | The system marks the domain confirmed. Nothing is routed until this happens. |

Post Condition: the domain is confirmed and the clinician remains in control (FR-9). Business Rules: the suggestion is only a hint — the system never routes care on its own and never presents anything as a diagnosis (NFR-3).

## 6. Other Nonfunctional Requirements

### 6.1 Performance Requirements

NFR-1: a single translation shall normally complete within about 5 seconds on a warm backend; recognised speech shall stream to the screen as the user speaks. The client aborts a translation request that exceeds 15 seconds and offers a retry. We deliberately picked the lighter cloud model to keep latency low and to avoid rate-limit failures mid-session — that decision paid off during our own test runs.

### 6.2 Safety Requirements

NFR-3: the system shall translate only and shall never present a diagnosis or clinical advice of its own. It shall preserve drug names, dosages, numbers, and units exactly (FR-4), and shall flag wrong-language or otherwise suspect output as “needs review” while still showing it, so a clinician can judge rather than be silently misled (FR-5). A suggested medical domain requires clinician confirmation before use (FR-9).

### 6.3 Security Requirements

NFR-4: the system shall not store audio and shall not persist any transcript on the server; the session transcript exists only on the user's device and clears on refresh. No personal or clinical identifiers are collected, and no accounts exist in this version. All traffic uses HTTPS; the backend restricts cross-origin requests to the known frontend origin; API keys are held server-side only and are never sent to the browser.

### 6.4 Software Quality Attributes

Usability (NFR-2): no training, sign-up, or install; voice and typing are equal paths, not a primary and a fallback.

Reliability (NFR-5): one engine failing doesn't crash the app; retry and engine switching are always available.

Portability (NFR-6): runs in modern browsers on phone and laptop; typing is a universal fallback where voice isn't supported.

Maintainability (NFR-7): every engine implements one interface, so adding an engine is one module with no change elsewhere — this is exactly what made Torongo a drop-in alongside the cloud model.

Accessibility (NFR-8): status is shown by shape and text as well as colour; Bangla uses a legible font at an enlarged size; every control is reachable by keyboard with a visible focus ring.

## 7. Other Requirements

### 7.1 Monitoring Strategy

The backend logs each request with a unique request id, the engine used, the language pair, the latency, and whether the output was flagged — without logging any personal data. A health endpoint reports which engine is configured and whether it's ready, which the frontend uses to show an online or offline state. For the live demo, we warm the backend and our own model beforehand and watch latency and error responses so a rate limit or cold start gets noticed and handled rather than surprising us mid-presentation.

### 7.2 Risk Management

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Cloud model rate limit during demo | Medium | Medium | Use the light model with generous limits; space out calls; switch to our own model; retry control |
| Our model's host cold-starts or goes down | Medium | Medium | Warm it before the demo; keep the cloud model as the default fallback |
| Wrong or unsafe translation | Low | High | Preserve clinical terms; flag doubtful output; clinician stays in control |
| Browser lacks voice support | Medium | Low | Typing path is always available |
| Network loss | Low | High | Clear offline state and retry; nothing depends on stored data |

### 7.3 Change Management Process

Changes to requirements start as a short note describing the change and the reason for it, get recorded in the Revision History with a new version number, get reviewed between the two of us, and are reflected in this SRS before the code changes. Because every engine sits behind one interface, adding or replacing a translation engine is a controlled, low-risk change that doesn't ripple through the rest of the system. Our project's private decision log records these choices and the reasoning behind them as they happen, which is what this process actually draws on.

## Appendix A. Glossary

| Term | Description |
| --- | --- |
| AI Medical Interpreter / Mita | The product: a real-time EN↔BN medical interpreter. |
| Provider (engine) | A translation backend behind one interface — here, Gemini or our own model. |
| Gemini | Google's cloud model, used as the default engine. |
| Torongo | Our own translation engine — a fine-tuned NLLB-200 model. |
| NLLB-200 | Meta's open multilingual translation model, used as the base for Torongo. |
| ASR | Automatic Speech Recognition (speech to text). |
| TTS | Text to Speech (spoken output). |
| Turn | One exchange: a source utterance and its translation. |
| Needs review | A flag on a translation the system judges doubtful. |
| CORS | Browser rule limiting which sites may call the backend. |

## Appendix B. Analysis Models

Covered above as the Domain Model (Section 4) and, for behaviour, the use-case flows in Section 5. A component view: Browser (UI, speech recognition, speech output) → Backend API → Provider interface → {Gemini cloud model | Torongo}. A data-flow view for one turn: microphone or keyboard → recognised or typed text → translate request → chosen engine → translated text → safety check → shown and spoken, then appended to the on-device session.

## Appendix C. Interface Examples

Home page: hero (“Care shouldn't get lost in translation”), header navigation (Use cases, Docs, FAQ, Resource), and sections for use cases, a four-step how-it-works, and an FAQ.

Mita console: left panel (session history, model card with a Switch provider control, guidelines, privacy note); centre panel (English/Bangla direction toggle, message card with a microphone, translation card with play and a verified indicator, conversation history); right panel (medical-domain grid with a confirm action).

(The current product screenshots are inserted here in the version submitted as a PDF.)

## Appendix D. To Be Determined List

- Final dataset size and evaluation numbers for our fine-tuned model.
- Whether regional dialect input (Sylheti, Chittagonian) gets handled in this version or a later one.
- Whether an optional saved-summary feature gets added — currently out of scope, though the summary service already exists as a seam.
