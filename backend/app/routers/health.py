"""GET /api/health -- schema.md section 2.2.

Called by the frontend once on load to set the status indicator (prd.md F-7).
"""

from fastapi import APIRouter, Depends

from app.config import get_settings
from app.deps import new_request_id
from app.models import Envelope, HealthData, ResponseMeta
from app.services.registry import provider_status

router = APIRouter(tags=["health"])


@router.get("/health", response_model=Envelope[HealthData, ResponseMeta])
async def health(request_id: str = Depends(new_request_id)) -> Envelope[HealthData, ResponseMeta]:
    """Report whether the service is up and whether translation can work.

    Always 200, even with no provider configured and no API key. A health
    endpoint that fails when the upstream is misconfigured tells the frontend
    nothing it can act on; provider_ready=false tells it exactly what to show.
    """
    settings = get_settings()
    provider_name, ready = provider_status()

    return Envelope[HealthData, ResponseMeta](
        data=HealthData(
            provider=provider_name,
            provider_ready=ready,
            version=settings.version,
        ),
        meta=ResponseMeta(request_id=request_id),
    )
