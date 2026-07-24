# scope.md

**Project:** Torongo — Healthcare Translation Web App
**Version:** v0.1 (Walking Skeleton)
**Course:** CSE309, Independent University Bangladesh
**By:** Syed Mehedi Hussain and Sakib Al Hasan
**Last updated:** 2026-07-25

---

## 1. What v0.1 is

A working web app where a person speaks into their microphone in **English or Bangla**, sees a live caption of what they said, and gets a translation into the other language — spoken back and shown on screen.

That is the entire product. One screen. One flow.

The full SRS describes a 9-month clinical system. v0.1 proves the hardest end-to-end path works: **voice in → text → translation → voice out**. Everything else in the SRS is built on top of that path. If it works, the rest is additive. If it doesn't, nothing else matters.

## 2. The one-sentence test

> A doctor opens the site, taps "Start listening," speaks a sentence in English, and the patient hears it in Bangla within a few seconds — without logging in, installing anything, or reading instructions.

If that works reliably, v0.1 is done.

## 3. In scope

| #    | Item                                   | Notes                                       |
| ---- | -------------------------------------- | ------------------------------------------- |
| S-1  | Single-page web app                    | No router needed yet                        |
| S-2  | Language pair selector                 | `en ⇄ bn` only, with a swap button          |
| S-3  | Live speech capture                    | Browser microphone, continuous listening    |
| S-4  | Live interim captions                  | Text appears while still speaking           |
| S-5  | Translation via third-party API        | Provider swappable behind one interface     |
| S-6  | Text-to-speech playback                | Translated text spoken aloud                |
| S-7  | Manual text input fallback             | Type instead of speak — same pipeline       |
| S-8  | In-session transcript list             | Lives in browser memory, gone on refresh    |
| S-9  | Clear error + permission states        | Mic denied, no network, unsupported browser |
| S-10 | FastAPI backend with one real endpoint | `POST /api/translate/text`                  |
| S-11 | Minimal, clean, responsive UI          | Function over polish                        |

## 4. Explicitly out of scope for v0.1

These are **deferred, not cancelled.** Each one has a designated seam in the code so it can be added without a rewrite. See `decisions.md` for where each seam lives.

| Deferred                               | Why                                 | Seam that keeps the door open                                   |
| -------------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| User accounts / login                  | Adds ~2 weeks, blocks nothing       | `get_current_user()` dependency returns an anonymous user today |
| Database persistence                   | Not needed to prove the flow        | `SessionRepository` protocol, in-memory implementation          |
| Clinical history / search              | Depends on persistence              | Same as above                                                   |
| Session summaries (SOAP)               | Depends on persistence              | —                                                               |
| PDF export                             | Depends on summaries                | —                                                               |
| Dialect detection (Sylheti, Chatgaiya) | Needs a trained model               | Response already carries a nullable `detected_dialect` field    |
| Self-trained NMT model                 | Needs a dataset first               | `TranslationProvider` interface — swap the implementation only  |
| Whisper ASR on the server              | Browser ASR is good enough now      | Frontend `useSpeech()` hook isolates the ASR source             |
| WebSocket streaming                    | Browser ASR already streams locally | Backend stays stateless and request/response                    |
| Clinical context selector              | No model to feed it to yet          | Field exists in the request body, ignored by the stub           |
| Safety flagging                        | Depends on clinical model           | Response already carries an empty `risk_flags` array            |
| Admin panel, audit logs, roles         | No users to administer              | —                                                               |
| Doctor approval workflow               | No records to approve               | —                                                               |
| WER / BLEU / TER evaluation            | No model of our own to evaluate     | —                                                               |
| Offline mode                           | —                                   | —                                                               |

## 5. Deliberately _not_ deferred

Three things are cheap now and expensive later. They go in v0.1 even though nothing uses them yet:

1. **The full response envelope.** Every translation returns `confidence`, `risk_flags`, `detected_dialect`, and `provider` — even when they're null or empty. Adding fields later means touching every frontend component. Adding them now costs nothing.
2. **The provider interface.** One Python protocol, one function signature. Everything downstream depends on the interface, never on the vendor.
3. **The anonymous-user dependency.** A one-line FastAPI dependency that returns a fixed fake user. When auth lands, only that one function changes.

## 6. Success criteria

v0.1 ships when all of these are true:

- [ ] Speaking English produces a Bangla translation in under 5 seconds on a normal connection
- [ ] Speaking Bangla produces an English translation in the same time
- [ ] Interim captions appear while the person is still talking
- [ ] Translated text is spoken aloud, or shows a clear message if no voice is available
- [ ] Denying microphone permission shows a readable explanation, not a blank screen
- [ ] Losing internet mid-session shows an error and keeps prior transcript lines
- [ ] The app is usable on a phone in portrait
- [ ] Someone else can clone the repo and run it from the README in under 10 minutes
- [ ] Every file in the repo can be explained out loud, without notes

## 7. Known limitations to disclose in the report

Not bugs. Documented tradeoffs.

- **Chrome/Edge only.** The Web Speech API is not implemented in Firefox and is partial in Safari. v0.1 detects this and says so.
- **Requires internet.** Both ASR and translation are cloud calls.
- **Bangla text-to-speech voices are inconsistent** across operating systems. Android and Windows generally have one; some Linux and older iOS builds do not.
- **General-domain translation.** The API has no medical vocabulary tuning. This is precisely the gap the thesis work aims to close, so it is a finding, not a failure.
- **Standard Bangla only.** No regional dialect support.

## 8. Relationship to the SRS

The SRS is an existing document, written by Md Sakib Al Hasan. It is a fixed input here, not something this project edits — it holds the full system vision and the research framing. This document is the implementation subset built from it.

When presenting: _"The SRS specifies the complete system. v0.1 implements the core translation pipeline end-to-end, with defined extension points for the remaining modules."_

Requirements from the SRS covered at least partially by v0.1: FR-2 (language pairing), FR-4 (text translation), FR-5 (live speech, browser-side), NFR-1 (performance), NFR-5 (usability), NFR-6 (accessibility).
