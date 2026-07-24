"""Provider selection: turns the TRANSLATION_PROVIDER setting into an instance.

This is the only place in the backend that knows which provider classes exist.
Routers ask for `get_provider()` and receive something satisfying the
TranslationProvider Protocol; they never learn which one.

Adding a provider in a later stage is two lines: import the class, add it to
_PROVIDERS. Nothing else in the app changes.
"""

from functools import lru_cache
from typing import Callable

from app.config import get_settings
from app.services.base import TranslationProvider
from app.services.stub import StubProvider


class ProviderConfigurationError(RuntimeError):
    """Raised when TRANSLATION_PROVIDER names a provider that does not exist.

    A configuration mistake, not a runtime failure, so it is deliberately not
    one of the contract's ErrorCode values. The exception handler added in task
    1.9 maps anything unhandled to a generic 500 INTERNAL_ERROR with the real
    reason logged server-side.
    """


# name -> factory. Stage 2 adds "google": GoogleProvider here.
_PROVIDERS: dict[str, Callable[[], TranslationProvider]] = {
    "stub": StubProvider,
}


@lru_cache
def get_provider() -> TranslationProvider:
    """Return the configured provider instance.

    Cached, so the instance is built once per process rather than per request.
    That matters from Stage 2 onward, when the Google provider holds an httpx
    client whose connection pool should be reused rather than rebuilt.

    Raises ProviderConfigurationError on an unknown name. This is raised on
    call, not at import, so a bad value cannot stop the server booting -- the
    app starts, and the failure surfaces on the first translation request with
    a message that names the problem.
    """
    configured = get_settings().translation_provider
    key = configured.strip().lower()

    factory = _PROVIDERS.get(key)
    if factory is None:
        known = ", ".join(sorted(_PROVIDERS))
        raise ProviderConfigurationError(
            f"TRANSLATION_PROVIDER is set to {configured!r}, which is not a known "
            f"provider. Known providers: {known}. "
            f"Check backend/.env against backend/.env.example."
        )
    return factory()
