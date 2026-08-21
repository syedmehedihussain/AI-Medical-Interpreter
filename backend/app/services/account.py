"""Account deletion, backed by Supabase.

A user cannot delete themselves from the browser (that needs the service-role
admin API), so the frontend calls DELETE /api/account and this module does the
work server-side: remove the user's saved reports, then delete the auth user via
the Supabase Auth admin endpoint. Same httpx + service-role style as
services/reports.py, scoped to a single verified `user_id`.
"""

import logging

import httpx

from app.config import get_settings
from app.errors import ReportsUnavailableError

logger = logging.getLogger(__name__)


def _headers() -> dict:
    key = get_settings().supabase_service_role_key
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


async def _delete_reports(client: httpx.AsyncClient, base: str, user_id: str) -> int:
    """Remove all of the user's reports; return how many rows were deleted."""
    response = await client.request(
        "DELETE",
        f"{base}/rest/v1/reports",
        params={"user_id": f"eq.{user_id}"},
        headers={**_headers(), "Prefer": "return=representation"},
    )
    if response.status_code >= 400:
        raise ReportsUnavailableError(
            log_detail=f"supabase reports delete {response.status_code}: {response.text[:300]}"
        )
    rows = response.json()
    return len(rows) if isinstance(rows, list) else 0


async def _delete_auth_user(client: httpx.AsyncClient, base: str, user_id: str) -> None:
    """Delete the Supabase auth user via the admin API."""
    response = await client.request(
        "DELETE",
        f"{base}/auth/v1/admin/users/{user_id}",
        headers=_headers(),
    )
    # 200/204 on success; 404 means the user is already gone, which is fine for
    # an idempotent delete.
    if response.status_code >= 400 and response.status_code != 404:
        raise ReportsUnavailableError(
            log_detail=f"supabase admin delete {response.status_code}: {response.text[:300]}"
        )


async def delete_account(user_id: str) -> int:
    """Delete the user's reports and their auth account. Returns reports removed."""
    settings = get_settings()
    base = settings.supabase_url.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            removed = await _delete_reports(client, base, user_id)
            await _delete_auth_user(client, base, user_id)
    except httpx.HTTPError as exc:
        raise ReportsUnavailableError(log_detail=f"supabase transport error: {exc}") from exc
    return removed
