"""POST /api/medications -- pull drug names out of one translated turn.

Added after v0.1. The frontend calls this per turn as the conversation runs and
appends any new medications to the console's Medications list. Not part of the
frozen translation contract; it has its own request/response models.
"""

import logging
import time

from fastapi import APIRouter, Depends

from app.deps import CurrentUser, get_current_user, new_request_id
from app.errors import AppError, InternalError
from app.models import Envelope, MedicationRequest, MedicationsData, ResponseMeta
from app.services.medications import extract_medications

logger = logging.getLogger(__name__)

router = APIRouter(tags=["medications"])


@router.post("/medications", response_model=Envelope[MedicationsData, ResponseMeta])
async def medications(
    payload: MedicationRequest,
    request_id: str = Depends(new_request_id),
    user: CurrentUser = Depends(get_current_user),
) -> Envelope[MedicationsData, ResponseMeta]:
    """Extract medications named in one turn of text.

    `user` is unused, deliberately, as on the other routes. Blank text is
    rejected by MedicationRequest's validator (EMPTY_INPUT) before this runs.
    """
    start = time.perf_counter()
    try:
        found = await extract_medications(payload.text)
    except AppError:
        # Provider errors (e.g. Gemini 503) travel to the handler untouched; the
        # frontend leaves the list unchanged for this turn.
        raise
    except Exception as exc:
        logger.exception("medication extraction failed unexpectedly [%s]", request_id)
        raise InternalError(log_detail=f"{type(exc).__name__}: {exc}") from exc
    latency_ms = int((time.perf_counter() - start) * 1000)

    logger.info(
        "extracted %d medication(s) in %dms [%s]", len(found), latency_ms, request_id
    )

    return Envelope[MedicationsData, ResponseMeta](
        data=MedicationsData(medications=found),
        meta=ResponseMeta(request_id=request_id),
    )
