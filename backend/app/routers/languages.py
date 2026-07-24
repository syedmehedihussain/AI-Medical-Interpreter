"""GET /api/languages -- schema.md section 2.3.

The frontend builds its language selectors from this rather than hardcoding
them, so enabling a dialect later is a backend-only change.
"""

from fastapi import APIRouter, Depends

from app.deps import new_request_id
from app.models import ENABLED_LANGUAGES, Envelope, LanguagesData, ResponseMeta

router = APIRouter(tags=["languages"])


@router.get("/languages", response_model=Envelope[LanguagesData, ResponseMeta])
async def languages(
    request_id: str = Depends(new_request_id),
) -> Envelope[LanguagesData, ResponseMeta]:
    """List the languages enabled in this build.

    ENABLED_LANGUAGES in models.py is the single source of truth, shared with
    request validation, so this endpoint and the validator can never disagree
    about which codes are legal.
    """
    return Envelope[LanguagesData, ResponseMeta](
        data=LanguagesData(languages=list(ENABLED_LANGUAGES)),
        meta=ResponseMeta(request_id=request_id),
    )
