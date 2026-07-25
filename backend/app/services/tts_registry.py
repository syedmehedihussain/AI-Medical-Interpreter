"""TTS provider selection. Mirrors services/registry.py exactly."""

from functools import lru_cache
from typing import Callable

from app.config import get_settings
from app.services.tts_base import TtsProvider
from app.services.tts_google import GoogleTranslateTtsProvider


class TtsConfigurationError(RuntimeError):
    """TTS_PROVIDER names a provider that does not exist."""


# Google Cloud Text-to-Speech goes here when a key exists, as one more line.
_TTS_PROVIDERS: dict[str, Callable[[], TtsProvider]] = {
    "google_translate": GoogleTranslateTtsProvider,
}


@lru_cache
def get_tts_provider() -> TtsProvider:
    """Return the configured TTS provider.

    Raises on call rather than at import, so a typo in .env cannot stop the
    server booting.
    """
    configured = get_settings().tts_provider
    key = configured.strip().lower()

    factory = _TTS_PROVIDERS.get(key)
    if factory is None:
        known = ", ".join(sorted(_TTS_PROVIDERS))
        raise TtsConfigurationError(
            f"TTS_PROVIDER is set to {configured!r}, which is not a known provider. "
            f"Known providers: {known}."
        )
    return factory()


def tts_status() -> tuple[str, bool]:
    """(configured name, whether it can serve). Never raises; used by /health."""
    configured = get_settings().tts_provider
    return configured, configured.strip().lower() in _TTS_PROVIDERS
