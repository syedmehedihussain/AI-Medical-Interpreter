"""FastAPI application entry point.

Run with:  uvicorn app.main:app --reload   (from backend/, venv activated)

Routers are mounted here as they arrive in later Stage 1 tasks. Right now the
app exists only to prove the server starts and CORS is configured.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

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


@app.get("/")
async def root() -> dict[str, str]:
    """Liveness check. The real health endpoint arrives in task 1.7."""
    return {"name": settings.app_name, "version": settings.version}
