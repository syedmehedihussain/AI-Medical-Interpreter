"""POST /api/summary -- an AI-written clinical note for the doctor.

Added after v0.1: takes the session transcript and returns a Gemini-generated
summary. Mirrors the translate router's shape and error handling, but is not
part of the frozen translation contract -- it has its own request/response
models (SummaryRequest / SummaryData).
"""

import logging
import time

from fastapi import APIRouter, Depends

from app.deps import CurrentUser, get_current_user, new_request_id
from app.errors import AppError, InternalError
from app.models import Envelope, ResponseMeta, SummaryData, SummaryRequest
from app.services.summary import summarize_conversation

logger = logging.getLogger(__name__)

router = APIRouter(tags=["summary"])


@router.post("/summary", response_model=Envelope[SummaryData, ResponseMeta])
async def summarize(
    payload: SummaryRequest,
    request_id: str = Depends(new_request_id),
    user: CurrentUser = Depends(get_current_user),
) -> Envelope[SummaryData, ResponseMeta]:
    """Summarise one session's transcript.

    `user` is unused, deliberately, for the same reason as the translate route:
    declaring the dependency now means auth in a later version changes
    get_current_user alone. An empty transcript is already rejected by
    SummaryRequest's validator (EMPTY_INPUT) before this runs.
    """
    start = time.perf_counter()
    try:
        summary = await summarize_conversation(payload.turns)
    except AppError:
        # The summarizer raises the contract's own provider errors; let them
        # travel to the handler untouched.
        raise
    except Exception as exc:
        logger.exception("summary failed unexpectedly [%s]", request_id)
        raise InternalError(log_detail=f"{type(exc).__name__}: {exc}") from exc
    latency_ms = int((time.perf_counter() - start) * 1000)

    logger.info(
        "summarised %d turns in %dms [%s]", len(payload.turns), latency_ms, request_id
    )

    return Envelope[SummaryData, ResponseMeta](
        data=SummaryData(summary=summary),
        meta=ResponseMeta(request_id=request_id),
    )
