"""Google translation via the keyless endpoint the web client uses.

Same tradeoff, and the same family of endpoint, as the TTS provider accepted
in D-016: no credentials, so it works today, but undocumented and without a
service guarantee. Development and demo only. `google.py` is the real Cloud
Translation v2 client and is what the deployed build should use.

Chosen over MyMemory after measuring both. MyMemory is a translation *memory*,
returning community-contributed matches, and on common conversational phrases
it returned Romanised Bangla, Hindi, and untranslated English. See D-017.
"""

import html
import json
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

ENDPOINT = "https://translate.googleapis.com/translate_a/single"

LANGUAGE_MAP = {
    "en": "en",
    "bn": "bn",
}

USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"


def parse_response(payload: str) -> str:
    """Pull the translated text out of the endpoint's nested-array response.

    The shape is [[[translated, source, ...], [translated, source, ...]], ...]
    with one inner entry per sentence, so a multi-sentence input must have its
    segments joined or only the first sentence survives.
    """
    data = json.loads(payload)
    segments = data[0]
    if not segments:
        raise ValueError("no translation segments")
    return "".join(segment[0] for segment in segments if segment and segment[0])


class GoogleFreeProvider:
    """TranslationProvider backed by Google's keyless web endpoint."""

    name = "google_free"

    async def translate(
        self, text: str, source_lang: str, target_lang: str, context: str | None = None
    ) -> TranslationResult:
        settings = get_settings()

        source = LANGUAGE_MAP.get(source_lang)
        target = LANGUAGE_MAP.get(target_lang)
        if not source or not target:
            raise ProviderUnavailableError(
                log_detail=f"no mapping for {source_lang!r} or {target_lang!r}"
            )

        try:
            async with httpx.AsyncClient(
                timeout=settings.request_timeout_seconds,
                headers={"User-Agent": USER_AGENT},
            ) as client:
                response = await client.get(
                    ENDPOINT,
                    params={
                        "client": "gtx",
                        "sl": source,
                        "tl": target,
                        "dt": "t",
                        "q": text,
                    },
                )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(log_detail=f"google_free timeout: {exc}") from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(log_detail=f"google_free transport: {exc}") from exc

        if response.status_code == 429:
            raise ProviderRateLimitedError(log_detail="google_free 429")
        if response.status_code >= 400:
            raise ProviderUnavailableError(
                log_detail=f"google_free {response.status_code}: {response.text[:200]}"
            )

        try:
            translated = parse_response(response.text)
        except (ValueError, IndexError, TypeError, KeyError) as exc:
            raise ProviderUnavailableError(
                log_detail=f"unexpected google_free response: {response.text[:200]}"
            ) from exc

        if not translated.strip():
            raise ProviderUnavailableError(log_detail="google_free returned empty text")

        return TranslationResult(translated_text=html.unescape(translated))
