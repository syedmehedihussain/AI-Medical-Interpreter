"""Keyless Google Translate speech endpoint.

The same tradeoff as the MyMemory translation provider (D-014): it needs no
credentials, so the app speaks Bangla today rather than after a billing form.

**This is an undocumented endpoint with no service guarantee.** It is a
development and demo provider. The deployed build should use Google Cloud
Text-to-Speech, which is a proper API with a key, and slots in behind the same
Protocol as one new file. Documented as a known limitation in the README.
"""

import logging

import httpx

from app.config import get_settings
from app.errors import (
    ProviderRateLimitedError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)

logger = logging.getLogger(__name__)

ENDPOINT = "https://translate.google.com/translate_tts"

LANGUAGE_MAP = {
    "en": "en",
    "bn": "bn",
}

# The endpoint rejects long inputs. Text is split below this and the resulting
# MP3 fragments are concatenated.
MAX_CHUNK_CHARS = 180

# Sent without one, the endpoint returns 403.
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"


def chunk_text(text: str, limit: int = MAX_CHUNK_CHARS) -> list[str]:
    """Split on word boundaries so a chunk never cuts a word in half.

    A word split mid-way is audible as a stutter, which is worse than a slight
    pause at a boundary.
    """
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) <= limit:
            current = candidate
            continue
        if current:
            chunks.append(current)
        # A single word longer than the limit still has to go somewhere; send
        # it whole and let the endpoint do what it can.
        current = word
    if current:
        chunks.append(current)
    return chunks


class GoogleTranslateTtsProvider:
    """TtsProvider backed by the Google Translate speech endpoint."""

    name = "google_translate"
    media_type = "audio/mpeg"

    async def synthesize(self, text: str, lang: str) -> bytes:
        settings = get_settings()

        target = LANGUAGE_MAP.get(lang)
        if not target:
            raise ProviderUnavailableError(log_detail=f"no TTS mapping for {lang!r}")

        chunks = chunk_text(text)
        if not chunks:
            raise ProviderUnavailableError(log_detail="nothing to synthesise")

        audio = bytearray()
        try:
            async with httpx.AsyncClient(
                timeout=settings.request_timeout_seconds,
                headers={"User-Agent": USER_AGENT},
            ) as client:
                for index, chunk in enumerate(chunks):
                    response = await client.get(
                        ENDPOINT,
                        params={
                            "ie": "UTF-8",
                            "q": chunk,
                            "tl": target,
                            "client": "tw-ob",
                            # Which part of a multi-part utterance this is.
                            "idx": index,
                            "total": len(chunks),
                            "textlen": len(chunk),
                        },
                    )
                    if response.status_code == 429:
                        raise ProviderRateLimitedError(log_detail="translate_tts 429")
                    if response.status_code >= 400:
                        raise ProviderUnavailableError(
                            log_detail=f"translate_tts {response.status_code}"
                        )
                    # Concatenated MP3 frames play as one stream in browsers,
                    # so no audio library is needed to join the chunks.
                    audio.extend(response.content)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(log_detail=f"translate_tts timeout: {exc}") from exc
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError(log_detail=f"translate_tts transport: {exc}") from exc

        if not audio:
            raise ProviderUnavailableError(log_detail="translate_tts returned no audio")

        return bytes(audio)
