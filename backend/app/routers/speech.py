"""GET /api/speech -- server-side text-to-speech (seam 5, decisions.md D-016).

The one endpoint that does not return the schema.md envelope, because its
successful response is audio rather than JSON. Errors still return the
standard error envelope, so failure handling on the frontend is unchanged.

GET rather than POST on purpose: the browser can then point an <audio> element
straight at the URL, which gets streaming, buffering, and playback control for
free instead of hand-managing a blob.
"""

import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.deps import CurrentUser, get_current_user, new_request_id
from app.models import ENABLED_LANGUAGE_CODES, MAX_TEXT_LENGTH
from app.errors import EmptyInputError, TextTooLongError, UnsupportedLanguageError
from app.services.tts_registry import get_tts_provider

logger = logging.getLogger(__name__)

router = APIRouter(tags=["speech"])


@router.get(
    "/speech",
    responses={200: {"content": {"audio/mpeg": {}}, "description": "Spoken audio"}},
)
async def speech(
    text: str = Query(..., description="Text to speak"),
    lang: str = Query(..., description="Internal language code, e.g. bn"),
    request_id: str = Depends(new_request_id),
    user: CurrentUser = Depends(get_current_user),
) -> Response:
    """Speak `text` in `lang` and return the audio.

    Validation mirrors the translate endpoint rather than being reinvented, so
    the same input produces the same error code from either route.
    """
    cleaned = text.strip()
    if not cleaned:
        raise EmptyInputError()
    if len(cleaned) > MAX_TEXT_LENGTH:
        raise TextTooLongError()
    if lang not in ENABLED_LANGUAGE_CODES:
        raise UnsupportedLanguageError(log_detail=f"tts requested for {lang!r}")

    provider = get_tts_provider()
    audio = await provider.synthesize(cleaned, lang)

    logger.info(
        "spoke %d chars in %s via %s -> %d bytes [%s]",
        len(cleaned), lang, provider.name, len(audio), request_id,
    )

    return Response(
        content=audio,
        media_type=provider.media_type,
        headers={
            # Same text and language always produce the same audio, so let the
            # browser reuse it. A repeated phrase costs no second round trip.
            "Cache-Control": "public, max-age=86400",
            "X-Request-ID": request_id,
        },
    )
