"""Google Cloud Translation v2 -- the provider stack.md section 3 specifies.

Plain REST with an API key: no SDK, no OAuth flow. Requires a Google Cloud
project with billing enabled, which is why the keyless MyMemory provider
exists alongside it for development (decisions.md D-014).
"""

import html
import logging

import httpx

from app.config import get_settings
from app.errors import (
    ProviderRateLimitedError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from app.models import TranslationResult

logger = logging.getLogger(__name__)

ENDPOINT = "https://translation.googleapis.com/language/translate/v2"

# Our internal codes to Google's. One dict so enabling a language is a
# one-line change rather than a hunt through the file.
LANGUAGE_MAP = {
    "en": "en",
    "bn": "bn",
}


class GoogleProvider:
    """TranslationProvider backed by Google Cloud Translation v2."""

    name = "google"

    async def translate(
        self, text: str, source_lang: str, target_lang: str, context: str | None = None
    ) -> TranslationResult:
        settings = get_settings()

        if not settings.google_ready:
            # Logged in detail, reported generically. Telling an anonymous
            # caller that the server has no credentials is a leak (E-16).
            logger.error("GOOGLE_TRANSLATE_API_KEY is not configured")
            raise ProviderUnavailableError(log_detail="missing GOOGLE_TRANSLATE_API_KEY")

        source = LANGUAGE_MAP.get(source_lang)
        target = LANGUAGE_MAP.get(target_lang)
        if not source or not target:
            raise ProviderUnavailableError(
                log_detail=f"no Google mapping for {source_lang!r} or {target_lang!r}"
            )

        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                response = await client.post(
                    ENDPOINT,
                    params={"key": settings.google_translate_api_key},
                    json={"q": text, "source": source, "target": target, "format": "text"},
                )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(log_detail=f"google timeout: {exc}") from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(log_detail=f"google transport error: {exc}") from exc

        if response.status_code == 429:
            raise ProviderRateLimitedError(log_detail=f"google 429: {response.text[:300]}")
        if response.status_code in (401, 403):
            raise ProviderUnavailableError(
                log_detail=f"google auth failure {response.status_code}: {response.text[:300]}"
            )
        if response.status_code >= 400:
            raise ProviderUnavailableError(
                log_detail=f"google {response.status_code}: {response.text[:300]}"
            )

        try:
            translations = response.json()["data"]["translations"]
            translated = translations[0]["translatedText"]
        except (KeyError, IndexError, ValueError) as exc:
            raise ProviderUnavailableError(
                log_detail=f"unexpected google response: {response.text[:300]}"
            ) from exc

        return TranslationResult(
            # Google escapes HTML entities even with format=text, so an
            # apostrophe comes back as &#39;. Unescaping here means no other
            # layer has to know that.
            translated_text=html.unescape(translated),
        )
