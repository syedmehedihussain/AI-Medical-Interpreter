"""Saved reports -- the v0.2 accounts feature. schema.md section 5 (ownership).

Every route here requires a signed-in user (require_reports_user) and operates
only on that user's rows; the user id comes from the verified token, never the
request body or query. Guests never reach these routes -- the frontend keeps the
save/history UI behind login -- and if they call directly they get 401, or 503
when the server has no Supabase configured.
"""

import logging

from fastapi import APIRouter, Depends, Request

from app.config import get_settings
from app.deps import CurrentUser, new_request_id, require_user
from app.errors import AppError, InternalError, NotFoundError, ReportsUnavailableError
from app.models import (
    Envelope,
    ReportCreate,
    ReportData,
    ReportsListData,
    ResponseMeta,
)
from app.services import reports as reports_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["reports"])


async def require_reports_user(request: Request) -> CurrentUser:
    """A signed-in user, but 503 first if saved reports aren't configured.

    Checking readiness before auth means an unconfigured server answers "reports
    unavailable" rather than a misleading 401 (which is what require_user would
    give, since without the JWT secret no token can be verified).
    """
    if not get_settings().supabase_ready:
        raise ReportsUnavailableError(log_detail="supabase settings not configured")
    return await require_user(request)


def _guard(request_id: str, action: str):
    """Context helper: log and normalise unexpected failures to InternalError."""
    # Kept as a tiny factory so each route's try/except reads the same way.
    class _Guard:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            if exc is None or isinstance(exc, AppError):
                return False  # AppErrors already carry the right status.
            logger.exception("reports %s failed [%s]", action, request_id)
            raise InternalError(log_detail=f"{type(exc).__name__}: {exc}") from exc

    return _Guard()


@router.post("/reports", response_model=Envelope[ReportData, ResponseMeta])
async def create_report(
    payload: ReportCreate,
    request_id: str = Depends(new_request_id),
    user: CurrentUser = Depends(require_reports_user),
) -> Envelope[ReportData, ResponseMeta]:
    """Save one report for the signed-in user."""
    with _guard(request_id, "create"):
        data = await reports_service.create(user.id, payload)
    logger.info("saved report %s [%s]", data.id, request_id)
    return Envelope[ReportData, ResponseMeta](data=data, meta=ResponseMeta(request_id=request_id))


@router.get("/reports", response_model=Envelope[ReportsListData, ResponseMeta])
async def list_reports(
    request_id: str = Depends(new_request_id),
    user: CurrentUser = Depends(require_reports_user),
) -> Envelope[ReportsListData, ResponseMeta]:
    """List the signed-in user's reports, newest first."""
    with _guard(request_id, "list"):
        items = await reports_service.list_for_user(user.id)
    return Envelope[ReportsListData, ResponseMeta](
        data=ReportsListData(reports=items), meta=ResponseMeta(request_id=request_id)
    )


@router.get("/reports/{report_id}", response_model=Envelope[ReportData, ResponseMeta])
async def get_report(
    report_id: str,
    request_id: str = Depends(new_request_id),
    user: CurrentUser = Depends(require_reports_user),
) -> Envelope[ReportData, ResponseMeta]:
    """Fetch one full report the user owns, or 404."""
    with _guard(request_id, "get"):
        data = await reports_service.get_for_user(user.id, report_id)
    if data is None:
        raise NotFoundError()
    return Envelope[ReportData, ResponseMeta](data=data, meta=ResponseMeta(request_id=request_id))


@router.delete("/reports/{report_id}", response_model=Envelope[ReportData, ResponseMeta])
async def delete_report(
    report_id: str,
    request_id: str = Depends(new_request_id),
    user: CurrentUser = Depends(require_reports_user),
) -> Envelope[ReportData, ResponseMeta]:
    """Delete one report the user owns, or 404. Returns a minimal echo."""
    with _guard(request_id, "delete"):
        removed = await reports_service.delete_for_user(user.id, report_id)
    if not removed:
        raise NotFoundError()
    logger.info("deleted report %s [%s]", report_id, request_id)
    return Envelope[ReportData, ResponseMeta](
        data=ReportData(id=report_id, created_at="", title="", language_pair="", summary=""),
        meta=ResponseMeta(request_id=request_id),
    )
