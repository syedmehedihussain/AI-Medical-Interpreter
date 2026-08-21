"""Request and response models: the frozen API contract.

Everything here mirrors docs/schema.md section 2. That contract is frozen
(decisions.md D-011): adding a database in v0.2 must not change any shape in
this file. If a change here would alter a request or response, stop and check
the spec before proceeding.

Field declaration order matters. Pydantic serialises in declaration order, so
the models below are written in the same order the JSON appears in schema.md.
"""

from enum import Enum
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# ---------------------------------------------------------------------------
# Language codes (schema.md section 1)
# ---------------------------------------------------------------------------


class LanguageInfo(BaseModel):
    """One entry in the GET /api/languages response (schema.md 2.3)."""

    code: str
    label: str
    native_label: str
    speech_supported: bool


# The languages actually enabled in v0.1. This tuple is the single source of
# truth for both validation and the /api/languages endpoint, so enabling a new
# language is a one-line change here rather than an edit in several places.
ENABLED_LANGUAGES: tuple[LanguageInfo, ...] = (
    LanguageInfo(code="en", label="English", native_label="English", speech_supported=True),
    LanguageInfo(code="bn", label="Bangla", native_label="বাংলা", speech_supported=True),
)

ENABLED_LANGUAGE_CODES: frozenset[str] = frozenset(lang.code for lang in ENABLED_LANGUAGES)

# Declared in schema.md section 1 but deliberately NOT enabled in v0.1. Listed
# here so the codes are reserved and their absence from ENABLED_LANGUAGE_CODES
# is visibly intentional rather than an oversight. Requesting one of these
# returns UNSUPPORTED_LANGUAGE, same as any unknown code.
RESERVED_LANGUAGE_CODES: frozenset[str] = frozenset({"bn-syl", "bn-ctg", "bn-mix", "unknown"})

# Text length bound from schema.md 5.4, measured after stripping.
MAX_TEXT_LENGTH = 500


class ClinicalContext(str, Enum):
    """Clinical context for a translation request.

    v0.1 defines exactly one value. The field is accepted and validated but
    ignored by every provider (decisions.md D-010), and there is deliberately
    no UI selector for it, because a visible control that changes nothing is a
    lie in the interface. The remaining contexts arrive in v0.3 alongside a
    model that can act on them; adding them is adding members here.
    """

    GENERAL = "general"


# ---------------------------------------------------------------------------
# Error codes (schema.md section 2.1)
# ---------------------------------------------------------------------------


class ErrorCode(str, Enum):
    """Every error code in the contract.

    The HTTP status and retryable flag for each live in app/errors.py (task
    1.9), not here, so this stays a plain vocabulary of names.
    """

    VALIDATION_ERROR = "VALIDATION_ERROR"
    EMPTY_INPUT = "EMPTY_INPUT"
    SAME_LANGUAGE = "SAME_LANGUAGE"
    UNSUPPORTED_LANGUAGE = "UNSUPPORTED_LANGUAGE"
    TEXT_TOO_LONG = "TEXT_TOO_LONG"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    PROVIDER_RATE_LIMITED = "PROVIDER_RATE_LIMITED"
    PROVIDER_TIMEOUT = "PROVIDER_TIMEOUT"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    # v0.2 accounts + saved reports
    AUTH_REQUIRED = "AUTH_REQUIRED"
    NOT_FOUND = "NOT_FOUND"
    REPORTS_UNAVAILABLE = "REPORTS_UNAVAILABLE"


# ---------------------------------------------------------------------------
# Risk flags (schema.md section 2.4)
# ---------------------------------------------------------------------------


class RiskFlagType(str, Enum):
    """Categories from SRS 6.6, quoted in schema.md 2.4."""

    DOSAGE = "dosage"
    ALLERGY = "allergy"
    EMERGENCY_SYMPTOM = "emergency_symptom"
    PREGNANCY = "pregnancy"
    UNCLEAR_DRUG_NAME = "unclear_drug_name"
    LOW_CONFIDENCE = "low_confidence"
    CONTRADICTION = "contradiction"


class RiskFlag(BaseModel):
    """A single clinical safety flag on a translation.

    Nothing produces one of these in v0.1 -- risk_flags is always []. The shape
    is defined now so that when the fine-tuned medical model starts emitting flags, no request or
    response shape changes (D-011).
    """

    type: RiskFlagType
    span: tuple[int, int]  # [start, end] character offsets into the source text
    # schema.md documents "high" but does not enumerate the full set, so this
    # stays a plain string rather than an invented enum. See SRS 6.6.
    severity: str
    note: str


# ---------------------------------------------------------------------------
# Request (schema.md section 2.4)
# ---------------------------------------------------------------------------


class TranslateRequest(BaseModel):
    """Body of POST /api/translate/text.

    Validation rules are schema.md 5.4. The validators raise AppError
    subclasses rather than ValueError, which is what gets each failure its own
    code and status (EMPTY_INPUT, SAME_LANGUAGE, UNSUPPORTED_LANGUAGE,
    TEXT_TOO_LONG) instead of collapsing them all into a 422.

    Why that works: Pydantic converts ValueError and AssertionError raised
    inside a validator into its own ValidationError, but lets any other
    exception type propagate untouched. AppError inherits from Exception,
    so it travels out through FastAPI's body parsing and reaches the handler
    registered in main.py. Verified, not assumed.

    The imports are inside the validator bodies on purpose. app.errors imports
    ErrorCode from this module, so importing it at the top here would be a
    circular import. A deferred import breaks the cycle and costs nothing,
    since Python caches modules after the first load.
    """

    # extra="forbid" is schema.md 5.4's "unknown fields rejected". Without it,
    # a typo like "source_language" would be silently ignored and the request
    # would translate into the default language instead of failing loudly.
    model_config = ConfigDict(extra="forbid")

    text: str
    source_lang: str
    target_lang: str
    context: ClinicalContext = ClinicalContext.GENERAL
    # Reserved for v0.2 persistence. Accepted and ignored in v0.1.
    session_id: str | None = None

    @field_validator("text")
    @classmethod
    def text_must_be_present_and_short_enough(cls, value: str) -> str:
        """Trim, then enforce the 1-500 character bound from schema.md 5.4.

        The stripped value is what gets returned, so everything downstream
        works with normalised text and no other layer has to remember to trim.
        """
        from app.errors import EmptyInputError, TextTooLongError

        stripped = value.strip()
        if not stripped:
            raise EmptyInputError()
        if len(stripped) > MAX_TEXT_LENGTH:
            raise TextTooLongError()
        return stripped

    @field_validator("source_lang", "target_lang")
    @classmethod
    def language_must_be_enabled(cls, value: str) -> str:
        """Reject any code not enabled in v0.1, reserved codes included.

        source_lang and target_lang are typed str rather than an Enum on
        purpose. An Enum would make an unknown code a Pydantic type error,
        which the contract reports as 422 VALIDATION_ERROR, but schema.md 2.1
        requires 400 UNSUPPORTED_LANGUAGE. Validating by hand keeps that
        distinction available.
        """
        from app.errors import UnsupportedLanguageError

        if value not in ENABLED_LANGUAGE_CODES:
            raise UnsupportedLanguageError(log_detail=f"rejected language code {value!r}")
        return value

    @model_validator(mode="after")
    def languages_must_differ(self) -> "TranslateRequest":
        """schema.md 5.4: source and target must not be the same language."""
        from app.errors import SameLanguageError

        if self.source_lang == self.target_lang:
            raise SameLanguageError()
        return self


# ---------------------------------------------------------------------------
# Conversation summary (added feature; additive to the frozen shapes above)
# ---------------------------------------------------------------------------


class SummaryTurn(BaseModel):
    """One line of the transcript sent to the summarizer.

    The frontend sends the English side of every exchange -- the doctor's own
    English utterance, or the English translation of the patient's Bangla -- so
    the resulting note reads in one language for the clinician. `speaker` is a
    plain string ("doctor" / "patient") rather than an enum: it is only used to
    label a line in the prompt, so an unexpected value degrades to that label
    rather than rejecting the whole request.
    """

    model_config = ConfigDict(extra="forbid")

    speaker: str
    text: str


class SummaryRequest(BaseModel):
    """Body of POST /api/summary.

    Not part of the frozen translation contract (D-011); this is the summary
    feature's own shape. An empty transcript, or one whose lines are all blank,
    is rejected as EMPTY_INPUT before any model call -- there is nothing to
    summarise and a live API request would be wasted.
    """

    model_config = ConfigDict(extra="forbid")

    turns: list[SummaryTurn]

    @field_validator("turns")
    @classmethod
    def turns_must_have_content(cls, value: list[SummaryTurn]) -> list[SummaryTurn]:
        from app.errors import EmptyInputError

        cleaned = [
            SummaryTurn(speaker=turn.speaker.strip() or "speaker", text=turn.text.strip())
            for turn in value
            if turn.text.strip()
        ]
        if not cleaned:
            raise EmptyInputError()
        return cleaned


class SummaryData(BaseModel):
    """The "data" object of POST /api/summary.

    A single block of plain text with labelled sections (Chief complaint, Key
    symptoms, History / meds mentioned, Suggested follow-up). Plain text rather
    than structured fields keeps the shape stable if the section list changes,
    and the frontend renders it verbatim.
    """

    summary: str


# ---------------------------------------------------------------------------
# Medication extraction (added feature; additive to the frozen shapes above)
# ---------------------------------------------------------------------------


class MedicationRequest(BaseModel):
    """Body of POST /api/medications.

    The frontend sends the English text of one translated turn; the service asks
    Gemini for any medications named in it. Blank text is rejected before any
    model call.
    """

    model_config = ConfigDict(extra="forbid")

    text: str

    @field_validator("text")
    @classmethod
    def text_must_be_present(cls, value: str) -> str:
        from app.errors import EmptyInputError

        stripped = value.strip()
        if not stripped:
            raise EmptyInputError()
        return stripped


class Medication(BaseModel):
    """One medication mentioned in the conversation.

    `name` is a canonical English drug name (a Bangla mention or a misspelling is
    normalised by the model). `dosage`, `times_per_day`, and `timing` carry
    whatever was said in the same breath, or empty when not stated;
    `times_per_day` is kept as a string ("2", "twice") so the model's phrasing
    survives and the field never fails validation on a non-integer. `confident`
    is False when the model is unsure it heard the name correctly, which the UI
    uses to show a louder warning on the verification popup.
    """

    name: str
    dosage: str = ""
    times_per_day: str = ""
    timing: str = ""
    confident: bool = True


class MedicationsData(BaseModel):
    """The "data" object of POST /api/medications."""

    medications: list[Medication] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Saved reports (v0.2 accounts; additive)
# ---------------------------------------------------------------------------


class ReportCreate(BaseModel):
    """Body of POST /api/reports -- what the doctor chose to save.

    `transcript` and `medications` are stored verbatim as JSON and are opaque to
    the backend: it persists and returns them without interpreting their inner
    shape, so the frontend owns that structure (a transcript turn is
    `{speaker, sourceText, translatedText, sourceLang, targetLang}`; a medication
    is `{name, dosage, timesPerDay, timing}`). A report with no dialogue is
    rejected -- there is nothing to save.
    """

    model_config = ConfigDict(extra="forbid")

    title: str = ""
    language_pair: str = ""
    summary: str = ""
    transcript: list[dict] = Field(default_factory=list)
    medications: list[dict] = Field(default_factory=list)

    @field_validator("transcript")
    @classmethod
    def transcript_must_be_present(cls, value: list[dict]) -> list[dict]:
        from app.errors import EmptyInputError

        if not value:
            raise EmptyInputError("Nothing to save yet.")
        return value


class ReportListItem(BaseModel):
    """One row in GET /api/reports -- enough to render the history list."""

    id: str
    created_at: str
    title: str
    language_pair: str
    medication_count: int


class ReportData(BaseModel):
    """A full saved report: GET /api/reports/{id} and the POST response.

    Carries everything the prescription shows -- the dialogue transcript, the
    summary, and the medications -- so the history detail can re-render and
    re-download it.
    """

    id: str
    created_at: str
    title: str
    language_pair: str
    summary: str
    transcript: list[dict] = Field(default_factory=list)
    medications: list[dict] = Field(default_factory=list)


class ReportsListData(BaseModel):
    """The "data" object of GET /api/reports."""

    reports: list[ReportListItem] = Field(default_factory=list)


class AccountDeletedData(BaseModel):
    """The "data" object of DELETE /api/account."""

    deleted: bool = True
    reports_removed: int = 0


# ---------------------------------------------------------------------------
# Internal provider result
# ---------------------------------------------------------------------------


class TranslationResult(BaseModel):
    """What a TranslationProvider returns (stack.md section 4, seam 1).

    Deliberately not the same object as TranslateData. This is the internal
    shape a provider produces; the router assembles the public response from
    it. Keeping them separate means a provider cannot accidentally decide what
    the API returns.

    The four clinical fields default to empty. A general translation API has
    nothing to put in them; the fine-tuned medical model will (D-011).
    """

    translated_text: str
    detected_dialect: str | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    risk_flags: list[RiskFlag] = Field(default_factory=list)
    needs_review: bool = False


# ---------------------------------------------------------------------------
# Response data objects
# ---------------------------------------------------------------------------


class TranslateData(BaseModel):
    """The "data" object of POST /api/translate/text (schema.md 2.4).

    Field order matches the spec exactly. The last five fields are always
    null/[]/false in v0.1 and are present anyway, which is the entire point of
    D-011: adding the clinical layer later changes no shape and no component.
    """

    source_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    detected_dialect: str | None = None
    confidence: float | None = None
    risk_flags: list[RiskFlag] = Field(default_factory=list)
    needs_review: bool = False
    context: ClinicalContext = ClinicalContext.GENERAL


class HealthData(BaseModel):
    """The "data" object of GET /api/health (schema.md 2.2)."""

    # v0.1 only ever emits "ok". Provider trouble is reported through
    # provider_ready, so the endpoint stays a 200 and the app shows Offline
    # rather than crashing.
    status: str = "ok"
    provider: str
    provider_ready: bool
    version: str


class LanguagesData(BaseModel):
    """The "data" object of GET /api/languages (schema.md 2.3)."""

    languages: list[LanguageInfo]


# ---------------------------------------------------------------------------
# Envelopes (schema.md section 2.1)
# ---------------------------------------------------------------------------


class ResponseMeta(BaseModel):
    """Meta for endpoints that only carry a request id.

    schema.md 2.2 and 2.3 show meta containing request_id alone, so provider
    and latency_ms are not optional fields here that serialise as null -- they
    are absent, on TranslateMeta below instead.
    """

    request_id: str


class TranslateMeta(ResponseMeta):
    """Meta for the translate endpoint, which also reports provider and timing."""

    provider: str
    latency_ms: int


DataT = TypeVar("DataT")
MetaT = TypeVar("MetaT", bound=ResponseMeta)


class Envelope(BaseModel, Generic[DataT, MetaT]):
    """Every successful response: {"data": ..., "meta": ...}.

    Generic over the meta type as well as the data type, which is load-bearing.
    Pydantic v2 serialises a field using its declared type, so annotating meta
    as ResponseMeta and passing a TranslateMeta would silently drop provider
    and latency_ms from the JSON. Parameterising it keeps the subclass fields.

    Used as Envelope[TranslateData, TranslateMeta] on the route signature.
    """

    data: DataT
    meta: MetaT


class ErrorDetail(BaseModel):
    """The "error" object (schema.md 2.1).

    message is written for the end user and is safe to display verbatim.
    Internal detail -- tracebacks, upstream provider messages, key problems --
    goes to the server log and never into this field (schema.md 5.3 rule 5).
    """

    code: ErrorCode
    message: str
    retryable: bool


class ErrorEnvelope(BaseModel):
    """Every error response: {"error": ..., "meta": ...}."""

    error: ErrorDetail
    meta: ResponseMeta
