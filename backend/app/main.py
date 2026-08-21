"""FastAPI application entry point.

Run with:  uvicorn app.main:app --reload   (from backend/, venv activated)

Routers are mounted here as they arrive in later Stage 1 tasks. Right now the
app exists only to prove the server starts and CORS is configured.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.deps import make_request_id
from app.errors import AppError
from app.models import ErrorCode, ErrorDetail, ErrorEnvelope, ResponseMeta
from app.routers import (
    account,
    health,
    languages,
    medications,
    reports,
    speech,
    summary,
    translate,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Real-time English and Bangla translation for clinical consultations.",
)

# The frontend runs on a different origin (localhost:5173) from this API
# (localhost:8000). Browsers block cross-origin requests unless the server
# opts in, which is what this middleware does. Origins come from settings so
# the deployed Vercel URL is an environment change, not a code change.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    """Stamp one id onto every request before anything else runs.

    Routes read it through the new_request_id dependency and the exception
    handlers below read it straight off request.state, so the id in a log line
    and the id in the response body always match. Also returned as a header so
    it can be read from the browser network tab without parsing the body.
    """
    request.state.request_id = make_request_id()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


def _error_response(request: Request, code: ErrorCode, message: str,
                    retryable: bool, status_code: int) -> JSONResponse:
    """Build the error envelope from schema.md section 2.1."""
    request_id = getattr(request.state, "request_id", "unknown")
    envelope = ErrorEnvelope(
        error=ErrorDetail(code=code, message=message, retryable=retryable),
        meta=ResponseMeta(request_id=request_id),
    )
    response = JSONResponse(status_code=status_code, content=envelope.model_dump(mode="json"))
    # Set here as well as in the middleware. An unhandled exception is caught
    # by Starlette's ServerErrorMiddleware, which sits *outside* user
    # middleware, so attach_request_id never gets to add the header on a 500.
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(AppError)
async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
    """Every error the app raises on purpose.

    exc.message is written for the end user and is safe to return. exc.log_detail
    holds the internal reason and is logged only, never serialised.
    """
    logger.warning(
        "%s on %s: %s [%s]",
        exc.code.value,
        request.url.path,
        exc.log_detail or exc.message,
        getattr(request.state, "request_id", "unknown"),
    )
    return _error_response(request, exc.code, exc.message, exc.retryable, exc.status_code)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Malformed bodies: wrong types, missing fields, unknown fields.

    FastAPI's default response embeds the offending input, which for this app
    means echoing user text back inside an error. The contract's generic
    message is returned instead and the detail is logged.
    """
    logger.warning(
        "VALIDATION_ERROR on %s: %s [%s]",
        request.url.path,
        exc.errors(),
        getattr(request.state, "request_id", "unknown"),
    )
    return _error_response(
        request, ErrorCode.VALIDATION_ERROR, "That request wasn't valid.", False, 422
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    """The catch-all. A bug reached the surface.

    The full traceback goes to the server log; the client gets a generic
    message and nothing else (schema.md 5.3 rule 5). This is also what turns a
    misconfigured TRANSLATION_PROVIDER into a clean 500 rather than a stack
    trace rendered in the browser.
    """
    logger.exception(
        "unhandled error on %s [%s]",
        request.url.path,
        getattr(request.state, "request_id", "unknown"),
    )
    return _error_response(
        request, ErrorCode.INTERNAL_ERROR, "Translation failed. Try again.", True, 500
    )


# Every API route lives under /api. The prefix is applied here rather than
# repeated in each router, so the routers stay unaware of where they are
# mounted and the URL layout is visible in one place.
app.include_router(health.router, prefix="/api")
app.include_router(languages.router, prefix="/api")
app.include_router(translate.router, prefix="/api")
app.include_router(summary.router, prefix="/api")
app.include_router(medications.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(account.router, prefix="/api")
app.include_router(speech.router, prefix="/api")


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    """Liveness check. Hidden from /docs; GET /api/health is the real one."""
    return {"name": settings.app_name, "version": settings.version}
