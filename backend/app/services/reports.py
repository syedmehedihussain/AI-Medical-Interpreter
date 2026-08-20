"""Saved-reports persistence, backed by Supabase Postgres via PostgREST.

Kept in the same httpx style as the translation providers rather than pulling in
the Supabase SDK: a report is a handful of CRUD calls, and going straight to
PostgREST keeps the dependency surface small and the behaviour easy to read.

Every call authenticates with the service-role key (a server-only secret) and is
scoped to one `user_id` in the query itself, so a user can only ever touch their
own rows. Row-Level Security is also enabled on the table as defence in depth,
but the service role bypasses it, so this module's user_id filtering is what
actually enforces ownership at runtime.
"""

import logging

import httpx

from app.config import get_settings
from app.errors import ReportsUnavailableError
from app.models import ReportCreate, ReportData, ReportListItem

logger = logging.getLogger(__name__)

TABLE = "reports"


def _base_url() -> str:
    settings = get_settings()
    return f"{settings.supabase_url.rstrip('/')}/rest/v1/{TABLE}"


def _headers(extra: dict | None = None) -> dict:
    settings = get_settings()
    key = settings.supabase_service_role_key
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


async def _request(method: str, *, params=None, json=None, headers=None) -> httpx.Response:
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            response = await client.request(
                method, _base_url(), params=params, json=json, headers=_headers(headers)
            )
    except httpx.HTTPError as exc:
        raise ReportsUnavailableError(log_detail=f"supabase transport error: {exc}") from exc
    if response.status_code >= 400:
        raise ReportsUnavailableError(
            log_detail=f"supabase {response.status_code}: {response.text[:300]}"
        )
    return response


def _to_report_data(row: dict) -> ReportData:
    return ReportData(
        id=str(row.get("id", "")),
        created_at=str(row.get("created_at", "")),
        title=row.get("title") or "",
        language_pair=row.get("language_pair") or "",
        summary=row.get("summary") or "",
        transcript=row.get("transcript") or [],
        medications=row.get("medications") or [],
    )


async def create(user_id: str, report: ReportCreate) -> ReportData:
    """Insert one report for `user_id` and return the stored row."""
    body = {
        "user_id": user_id,
        "title": report.title,
        "language_pair": report.language_pair,
        "summary": report.summary,
        "transcript": report.transcript,
        "medications": report.medications,
    }
    response = await _request(
        "POST", json=body, headers={"Prefer": "return=representation"}
    )
    rows = response.json()
    if not rows:
        raise ReportsUnavailableError(log_detail="supabase insert returned no row")
    return _to_report_data(rows[0])


async def list_for_user(user_id: str) -> list[ReportListItem]:
    """Return the user's reports, newest first, as lightweight list rows."""
    response = await _request(
        "GET",
        params={
            "user_id": f"eq.{user_id}",
            "select": "id,created_at,title,language_pair,medications",
            "order": "created_at.desc",
        },
    )
    items = []
    for row in response.json():
        meds = row.get("medications") or []
        items.append(
            ReportListItem(
                id=str(row.get("id", "")),
                created_at=str(row.get("created_at", "")),
                title=row.get("title") or "",
                language_pair=row.get("language_pair") or "",
                medication_count=len(meds) if isinstance(meds, list) else 0,
            )
        )
    return items


async def get_for_user(user_id: str, report_id: str) -> ReportData | None:
    """Return one full report if it belongs to the user, else None."""
    response = await _request(
        "GET",
        params={"id": f"eq.{report_id}", "user_id": f"eq.{user_id}", "select": "*"},
    )
    rows = response.json()
    return _to_report_data(rows[0]) if rows else None


async def delete_for_user(user_id: str, report_id: str) -> bool:
    """Delete one report if it belongs to the user; True when a row was removed."""
    response = await _request(
        "DELETE",
        params={"id": f"eq.{report_id}", "user_id": f"eq.{user_id}"},
        headers={"Prefer": "return=representation"},
    )
    return bool(response.json())
