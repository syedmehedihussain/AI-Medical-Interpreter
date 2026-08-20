"""Application settings.

Every environment variable listed in docs/stack.md section 5 is declared here,
once. Nothing else in the app reads os.environ directly, so this file is the
single place to look when asking "what can be configured?".
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/config.py -> backend/
# Resolved from this file rather than the current working directory, so the
# server picks up backend/.env whether it is started from backend/ or from the
# repository root.
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Settings read from the environment, falling back to backend/.env.

    Field names are lowercase; the matching environment variables are the
    uppercase form (allowed_origins <- ALLOWED_ORIGINS). Every field has a
    default, which is what keeps a missing .env from stopping the server.
    """

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "AI Medical Interpreter"
    version: str = "0.1.0"

    # stub | mymemory | google_free | google | gemini
    translation_provider: str = "google_free"

    # Deliberately optional. A missing key must not stop the server starting;
    # it only means the google provider is not ready. See google_ready below.
    google_translate_api_key: str | None = None

    # Google AI Studio (Gemini) API key. Only read when TRANSLATION_PROVIDER is
    # "gemini". A Gemini key is a different product from the Cloud Translation
    # key above: it drives generativelanguage.googleapis.com, not
    # translation.googleapis.com, so the two are not interchangeable. Like the
    # Google key, a missing value never stops the server; it only makes the
    # gemini provider report not-ready. See gemini_ready below.
    gemini_api_key: str | None = None

    # Which Gemini model the gemini provider calls. A flash-tier model is fast
    # and cheap enough for one-sentence clinical translation. Overridable so a
    # newer model can be adopted without a code change.
    gemini_model: str = "gemini-3.7-flash"

    # Comma-separated, not a list. pydantic-settings tries to JSON-parse any
    # field typed as list[str], so ALLOWED_ORIGINS=http://localhost:5173 would
    # fail at startup with a confusing parse error. Keeping the raw value a
    # string and splitting it in allowed_origins_list avoids that entirely.
    allowed_origins: str = "http://localhost:5173"

    # Which text-to-speech provider serves GET /api/speech. Used only when the
    # browser has no local voice for the target language (decisions.md D-016).
    tts_provider: str = "google_translate"

    # Seconds to wait on the upstream translation provider. Used from Stage 2.
    request_timeout_seconds: float = 15.0

    # --- Supabase (v0.2 accounts + saved reports) ------------------------------
    # All optional, like the provider keys: absent values never stop the server
    # starting, they only make the reports feature report not-ready (503). The
    # translation/summary/medication features do not depend on any of these.
    #   supabase_url                -> https://<project>.supabase.co
    #   supabase_service_role_key   -> writes rows via PostgREST (server-only secret)
    #   supabase_jwt_secret         -> verifies the Supabase access token (HS256)
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_jwt_secret: str | None = None

    @property
    def allowed_origins_list(self) -> list[str]:
        """ALLOWED_ORIGINS parsed into the list CORSMiddleware expects."""
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def google_ready(self) -> bool:
        """True when a Google API key is configured.

        Consumed by GET /api/health as provider_ready (docs/schema.md 2.2).
        """
        return bool(self.google_translate_api_key and self.google_translate_api_key.strip())

    @property
    def gemini_ready(self) -> bool:
        """True when a Google AI Studio (Gemini) API key is configured.

        Consumed by GET /api/health as provider_ready when TRANSLATION_PROVIDER
        is "gemini", mirroring google_ready.
        """
        return bool(self.gemini_api_key and self.gemini_api_key.strip())

    @property
    def supabase_ready(self) -> bool:
        """True when all three Supabase settings are present.

        The reports feature needs the URL (where to write), the service role key
        (permission to write), and the JWT secret (to trust the caller). Missing
        any one means the feature reports unavailable rather than half-working.
        """
        return bool(
            (self.supabase_url or "").strip()
            and (self.supabase_service_role_key or "").strip()
            and (self.supabase_jwt_secret or "").strip()
        )


@lru_cache
def get_settings() -> Settings:
    """Return the settings singleton.

    Cached so the .env file is read once per process rather than on every
    request, and so every caller sees the same object.
    """
    return Settings()
