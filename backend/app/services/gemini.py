"""Gemini (Google AI Studio) translation provider.

Unlike google.py, this does NOT use Google Cloud Translation v2. It calls the
Gemini generative API at generativelanguage.googleapis.com with a key issued by
Google AI Studio (https://aistudio.google.com/apikey). The two are different
products with different endpoints and different keys; a Cloud Translation key
will not work here, and an AI Studio key will not work in google.py.

Why a generative model for translation: this app is a medical interpreter, so
faithfulness on drug names, dosages, units, and clinical phrasing matters more
than raw fluency. A prompted model can be told to preserve those exactly. The
clinical fields on TranslationResult (risk_flags, confidence, detected_dialect)
are still left empty in this first pass; populating them from the model is a
later step (decisions.md D-011). The wrong-script safety guard in quality.py
runs on this provider's output just as it does on every other provider's.
"""

import asyncio
import logging

import httpx

from app.config import get_settings
from app.errors import (
    AppError,
    ProviderRateLimitedError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from app.models import TranslationResult

logger = logging.getLogger(__name__)

# Free-tier Gemini keys occasionally return a transient 403/timeout on
# back-to-back calls that succeeds on an immediate retry (observed during
# testing). A live clinical demo failing a single translation looks bad, so
# each request is attempted a few times with a short linear backoff before the
# error is surfaced. Non-transient mistakes (missing key, unmapped language)
# are raised before the loop and never retried.
MAX_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 0.6

# {model} is substituted with settings.gemini_model at call time. The API key is
# sent in the x-goog-api-key header rather than the URL so it never lands in a
# request log.
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# Internal codes -> human language names for the prompt. Kept here, like the
# LANGUAGE_MAP in the other providers, so enabling a language is one line.
LANGUAGE_NAMES = {
    "en": "English",
    "bn": "Bangla (Bengali)",
}


def build_prompt(text: str, source_name: str, target_name: str) -> str:
    """The instruction sent to the model.

    Written for a clinical setting: translate faithfully, keep the parts that
    must not change (drug names, dosages, numbers, units), and return only the
    translation with no preamble, quotes, or explanation, so the response can be
    shown to a patient verbatim.
    """
    return (
        f"You are a medical interpreter translating a single utterance in a "
        f"clinical consultation from {source_name} to {target_name}.\n"
        f"Rules:\n"
        f"- Translate the meaning faithfully in a clear, respectful register a "
        f"patient would understand.\n"
        f"- Keep drug names, dosages, numbers, and units exactly as written "
        f"(for example \"Napa 500mg\" stays \"Napa 500mg\").\n"
        f"- Do not add, omit, or explain anything.\n"
        f"- Output ONLY the {target_name} translation, with no quotes, labels, "
        f"or notes.\n\n"
        f"Text to translate:\n{text}"
    )


def parse_response(payload: dict) -> str:
    """Pull the translated text out of a generateContent response.

    Text lives at candidates[0].content.parts[0].text. A response can arrive
    with no candidates when the model blocks the prompt for safety; that is
    surfaced as a provider error rather than an empty string, so the caller does
    not display a blank translation as if it succeeded.
    """
    candidates = payload.get("candidates")
    if not candidates:
        reason = payload.get("promptFeedback", {}).get("blockReason", "no candidates")
        raise ValueError(f"gemini returned no candidates ({reason})")
    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts)
    return text.strip()


class GeminiProvider:
    """TranslationProvider backed by the Gemini generative API."""

    name = "gemini"

    async def translate(
        self, text: str, source_lang: str, target_lang: str, context: str | None = None
    ) -> TranslationResult:
        settings = get_settings()

        if not settings.gemini_ready:
            # Logged in detail, reported generically -- telling an anonymous
            # caller the server has no key is a leak (errors.py E-16).
            logger.error("GEMINI_API_KEY is not configured")
            raise ProviderUnavailableError(log_detail="missing GEMINI_API_KEY")

        source_name = LANGUAGE_NAMES.get(source_lang)
        target_name = LANGUAGE_NAMES.get(target_lang)
        if not source_name or not target_name:
            raise ProviderUnavailableError(
                log_detail=f"no Gemini mapping for {source_lang!r} or {target_lang!r}"
            )

        url = ENDPOINT.format(model=settings.gemini_model)
        prompt = build_prompt(text, source_name, target_name)

        # Retry loop for transient failures. Every provider error here is
        # retryable=True, so the last attempt's exception is the one surfaced.
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                return await self._attempt(url, prompt, settings)
            except AppError as exc:
                if attempt < MAX_ATTEMPTS:
                    logger.warning(
                        "gemini attempt %d/%d failed (%s); retrying",
                        attempt, MAX_ATTEMPTS, exc.code.value,
                    )
                    await asyncio.sleep(RETRY_BACKOFF_SECONDS * attempt)
                    continue
                raise

    async def _attempt(self, url: str, prompt: str, settings) -> TranslationResult:
        """One request/parse cycle. Raises a provider AppError on any failure."""
        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                response = await client.post(
                    url,
                    headers={"x-goog-api-key": settings.gemini_api_key},
                    json={"contents": [{"parts": [{"text": prompt}]}]},
                )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(log_detail=f"gemini timeout: {exc}") from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(log_detail=f"gemini transport error: {exc}") from exc

        if response.status_code == 429:
            raise ProviderRateLimitedError(log_detail=f"gemini 429: {response.text[:300]}")
        if response.status_code in (401, 403):
            raise ProviderUnavailableError(
                log_detail=f"gemini auth failure {response.status_code}: {response.text[:300]}"
            )
        if response.status_code >= 400:
            raise ProviderUnavailableError(
                log_detail=f"gemini {response.status_code}: {response.text[:300]}"
            )

        try:
            translated = parse_response(response.json())
        except (KeyError, IndexError, ValueError) as exc:
            raise ProviderUnavailableError(
                log_detail=f"unexpected gemini response: {response.text[:300]}"
            ) from exc

        if not translated:
            raise ProviderUnavailableError(log_detail="gemini returned empty text")

        return TranslationResult(translated_text=translated)
