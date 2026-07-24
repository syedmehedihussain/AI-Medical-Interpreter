"""POST /api/translate/text -- schema.md section 2.4. SRS FR-4.

The one endpoint that matters in v0.1. Voice input and typed input both arrive
here; the only difference is where the frontend got the text.
"""

import logging
import time

from fastapi import APIRouter, Depends

from app.deps import CurrentUser, get_current_user, new_request_id
from app.errors import InternalError, TorongoError
from app.models import Envelope, TranslateData, TranslateMeta, TranslateRequest
from app.services.registry import get_provider

logger = logging.getLogger(__name__)

router = APIRouter(tags=["translate"])


@router.post("/translate/text", response_model=Envelope[TranslateData, TranslateMeta])
async def translate_text(
    payload: TranslateRequest,
    request_id: str = Depends(new_request_id),
    user: CurrentUser = Depends(get_current_user),
) -> Envelope[TranslateData, TranslateMeta]:
    """Translate one piece of text.

    `user` is unused and that is deliberate (seam 2, decisions.md D-007).
    Declaring the dependency now means v0.2 adds authentication by changing
    get_current_user alone, with no endpoint signature to rewrite.

    The request body is already validated by the time this runs: blank text,
    over-long text, an unknown language, and source == target all raise from
    TranslateRequest's validators before the function is entered.
    """
    provider = get_provider()

    start = time.perf_counter()
    try:
        result = await provider.translate(
            text=payload.text,
            source_lang=payload.source_lang,
            target_lang=payload.target_lang,
            context=payload.context,
        )
    except TorongoError:
        # Providers raise the contract's own errors (PROVIDER_TIMEOUT and
        # friends, from Stage 2 onward). Those are already correct; let them
        # travel to the handler untouched.
        raise
    except Exception as exc:
        # Anything else is a bug in a provider. Log the real cause, return the
        # generic message (schema.md 5.3 rule 5).
        logger.exception("provider %s raised an unexpected error [%s]", provider.name, request_id)
        raise InternalError(log_detail=f"{type(exc).__name__}: {exc}") from exc
    latency_ms = int((time.perf_counter() - start) * 1000)

    logger.info(
        "translated %s->%s via %s in %dms [%s]",
        payload.source_lang,
        payload.target_lang,
        provider.name,
        latency_ms,
        request_id,
    )

    return Envelope[TranslateData, TranslateMeta](
        data=TranslateData(
            source_text=payload.text,
            translated_text=result.translated_text,
            source_lang=payload.source_lang,
            target_lang=payload.target_lang,
            detected_dialect=result.detected_dialect,
            confidence=result.confidence,
            risk_flags=result.risk_flags,
            needs_review=result.needs_review,
            context=payload.context,
        ),
        meta=TranslateMeta(
            request_id=request_id,
            provider=provider.name,
            latency_ms=latency_ms,
        ),
    )
