"""MyMemory -- a keyless translation provider for development.

Why this exists (decisions.md D-014): Google Cloud Translation requires a
project with billing enabled, which blocks the app on an account setup step
that has nothing to do with the code. MyMemory's anonymous tier needs no key
and no signup, so the pipeline can be demonstrated end to end today.

It is NOT the production choice. The anonymous quota is roughly 5000 characters
a day and quality is below Google's. Google stays the target for the final
build; switching is one environment variable, which is the seam doing its job.
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

ENDPOINT = "https://api.mymemory.translated.net/get"

LANGUAGE_MAP = {
    "en": "en",
    "bn": "bn",
}


class MyMemoryProvider:
    """TranslationProvider backed by MyMemory's anonymous API."""

    name = "mymemory"

    async def translate(
        self, text: str, source_lang: str, target_lang: str, context: str | None = None
    ) -> TranslationResult:
        settings = get_settings()

        source = LANGUAGE_MAP.get(source_lang)
        target = LANGUAGE_MAP.get(target_lang)
        if not source or not target:
            raise ProviderUnavailableError(
                log_detail=f"no MyMemory mapping for {source_lang!r} or {target_lang!r}"
            )

        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                response = await client.get(
                    ENDPOINT,
                    params={"q": text, "langpair": f"{source}|{target}"},
                )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(log_detail=f"mymemory timeout: {exc}") from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(log_detail=f"mymemory transport error: {exc}") from exc

        if response.status_code == 429:
            raise ProviderRateLimitedError(log_detail="mymemory 429")
        if response.status_code >= 400:
            raise ProviderUnavailableError(
                log_detail=f"mymemory {response.status_code}: {response.text[:300]}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise ProviderUnavailableError(
                log_detail=f"mymemory returned non-JSON: {response.text[:300]}"
            ) from exc

        # MyMemory reports its own status inside a 200 response, so the HTTP
        # code alone is not enough to know the call succeeded.
        status = payload.get("responseStatus")
        if status not in (200, "200"):
            detail = payload.get("responseDetails") or payload.get("responseStatus")
            # The daily quota is reported this way rather than as a 429.
            if "QUOTA" in str(detail).upper() or payload.get("quotaFinished"):
                raise ProviderRateLimitedError(log_detail=f"mymemory quota: {detail}")
            raise ProviderUnavailableError(log_detail=f"mymemory status {status}: {detail}")

        translated = (payload.get("responseData") or {}).get("translatedText")
        if not translated:
            raise ProviderUnavailableError(log_detail=f"mymemory empty result: {payload}")

        return TranslationResult(translated_text=html.unescape(translated))
