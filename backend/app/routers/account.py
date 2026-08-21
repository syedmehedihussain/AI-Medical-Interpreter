"""Account management -- currently just self-deletion (v0.2 accounts).

DELETE /api/account removes the signed-in user's saved reports and their auth
account. Requires a signed-in user (the id comes from the verified token, never
the request), and 503s first when Supabase isn't configured -- mirroring the
saved-reports routes.
"""

import logging

from fastapi import APIRouter, Depends, Request

from app.config import get_settings
from app.deps import CurrentUser, new_request_id, require_user
from app.errors import AppError, InternalError, ReportsUnavailableError
from app.models import AccountDeletedData, Envelope, ResponseMeta
from app.services import account as account_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["account"])


async def require_account_user(request: Request) -> CurrentUser:
    """A signed-in user, but 503 first if accounts aren't configured."""
    if not get_settings().supabase_ready:
        raise ReportsUnavailableError(log_detail="supabase settings not configured")
    return await require_user(request)


@router.delete("/account", response_model=Envelope[AccountDeletedData, ResponseMeta])
async def delete_account(
    request_id: str = Depends(new_request_id),
    user: CurrentUser = Depends(require_account_user),
) -> Envelope[AccountDeletedData, ResponseMeta]:
    """Delete the signed-in user's account and all their reports."""
    try:
        removed = await account_service.delete_account(user.id)
    except AppError:
        raise
    except Exception as exc:  # noqa: BLE001 -- normalise to InternalError
        logger.exception("account delete failed [%s]", request_id)
        raise InternalError(log_detail=f"{type(exc).__name__}: {exc}") from exc
    logger.info("deleted account %s (%d reports) [%s]", user.id, removed, request_id)
    return Envelope[AccountDeletedData, ResponseMeta](
        data=AccountDeletedData(deleted=True, reports_removed=removed),
        meta=ResponseMeta(request_id=request_id),
    )
