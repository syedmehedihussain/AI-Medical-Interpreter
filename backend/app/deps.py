"""Seam 2: the current user.

This is the seam decisions.md D-007 reserved for authentication. v0.1 shipped
it returning a single anonymous operator; v0.2 fills it in, and -- exactly as
intended -- nothing else moved: every endpoint still declares
`user = Depends(get_current_user)`, no route signature changed.

get_current_user now reads the `Authorization: Bearer` header and, if it carries
a valid Supabase access token, returns that user. A missing or invalid token is
NOT an error here: the interpreter is usable signed-out (guest mode), so those
requests simply get the anonymous operator. Routes that genuinely require a
login (the saved-reports endpoints) add the `require_user` dependency, which
turns anonymous into a 401.
"""

import logging
from uuid import uuid4

import jwt
from fastapi import Request
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)

# Supabase signs access tokens with this audience; verifying it rejects tokens
# minted for a different purpose (e.g. refresh tokens).
_JWT_AUDIENCE = "authenticated"

# Supabase can sign tokens two ways: the legacy shared HS256 secret, or (the
# default for newer projects) an asymmetric key (ES256/RS256) published at the
# project's JWKS endpoint. We support both. The JWKS client is created lazily
# and cached -- it fetches and caches the public keys, so verification after the
# first token is a local operation.
_ASYMMETRIC_ALGS = ("ES256", "RS256")
_jwks_client = None


def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        base = (get_settings().supabase_url or "").rstrip("/")
        _jwks_client = jwt.PyJWKClient(f"{base}/auth/v1/.well-known/jwks.json")
    return _jwks_client


def make_request_id() -> str:
    """Mint a short id for one request.

    Eight hex characters, matching the examples in schema.md section 2. Not a
    full UUID because this is a correlation handle for reading logs, not an
    identifier for anything stored. Short enough to quote in a bug report.
    """
    return uuid4().hex[:8]


async def new_request_id(request: Request) -> str:
    """The current request's id, for the `meta.request_id` field.

    Reads the id that main.py's middleware stamped onto request.state, so a
    route response and an error response for the same request carry the *same*
    id. Generating one here instead would mean a failed request logged one id
    and returned another, which defeats the point of having one.

    Falls back to minting an id if the middleware did not run, so a route can
    never fail merely because the id is missing.
    """
    return getattr(request.state, "request_id", None) or make_request_id()


class CurrentUser(BaseModel):
    """Who is making this request.

    A signed-in user carries their Supabase `id` (the `sub` claim, a UUID) and
    `email`; the anonymous operator has id "anonymous" and is_anonymous=True.
    `role` stays a coarse label for now ("operator" for guests, "user" for
    signed-in accounts); per-account roles are a later concern.
    """

    id: str
    role: str
    is_anonymous: bool
    email: str | None = None


ANONYMOUS_USER = CurrentUser(id="anonymous", role="operator", is_anonymous=True)


def _decode_supabase_token(token: str) -> CurrentUser | None:
    """Verify a Supabase access token; return the user, or None if it is bad.

    Handles both signing schemes: an ES256/RS256 token is verified against the
    project's JWKS public key; an HS256 token against the shared JWT secret.
    Returns None (rather than raising) for every failure -- unconfigured, expired,
    wrong audience, unknown key, malformed -- because the caller treats a bad
    token the same as no token: an anonymous request. The reason is logged at
    debug level for diagnosis, never surfaced.
    """
    try:
        alg = jwt.get_unverified_header(token).get("alg")
        if alg in _ASYMMETRIC_ALGS:
            key = _get_jwks_client().get_signing_key_from_jwt(token).key
            algorithms = [alg]
        elif alg == "HS256":
            key = (get_settings().supabase_jwt_secret or "").strip()
            if not key:
                return None
            algorithms = ["HS256"]
        else:
            logger.debug("rejected supabase token: unsupported alg %r", alg)
            return None
        claims = jwt.decode(token, key, algorithms=algorithms, audience=_JWT_AUDIENCE)
    except Exception as exc:  # PyJWT errors, plus JWKS fetch/parse failures.
        logger.debug("rejected supabase token: %s", exc)
        return None

    subject = claims.get("sub")
    if not subject:
        return None
    return CurrentUser(
        id=str(subject),
        role="user",
        is_anonymous=False,
        email=claims.get("email"),
    )


async def get_current_user(request: Request) -> CurrentUser:
    """Return the signed-in user if a valid token is present, else anonymous.

    Async so the signature never has to change; FastAPI injects `request`, so
    the many `Depends(get_current_user)` call sites are unchanged.
    """
    header = request.headers.get("Authorization") or ""
    scheme, _, token = header.partition(" ")
    if scheme.lower() == "bearer" and token.strip():
        user = _decode_supabase_token(token.strip())
        if user is not None:
            return user
    return ANONYMOUS_USER


async def require_user(request: Request) -> CurrentUser:
    """Like get_current_user, but 401s when the request is not signed in.

    Used on the saved-reports routes: those are meaningless without an owner.
    """
    from app.errors import AuthRequiredError

    user = await get_current_user(request)
    if user.is_anonymous:
        raise AuthRequiredError()
    return user
