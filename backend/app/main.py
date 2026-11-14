import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import init_db, seed_data
from app.routes import (
    tasks,
    analytics,
    ai,
    planner,
    notes,
    learning,
    calendar,
    goals,
    achievements,
    notifications,
    focus,
    settings,
    auth,
)

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR.parent / ".env")

def _cors_origins() -> list[str]:
    raw = (os.getenv("CORS_ORIGINS") or "").strip()
    if not raw:
        # Development-friendly default; set CORS_ORIGINS in production (comma-separated).
        return ["*"]
    origins = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    return origins or ["*"]


app = FastAPI(
    title="StudySphere API",
    description="Smart Student Productivity Assistant backend",
    version="1.0.0",
)

_cors = _cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors,
    allow_credentials=False if "*" in _cors else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes are registered before the SPA fallback.
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(planner.router, prefix="/api/planner", tags=["planner"])
app.include_router(notes.router, prefix="/api/notes", tags=["notes"])
app.include_router(learning.router, prefix="/api/learning", tags=["learning"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["calendar"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])
app.include_router(achievements.router, prefix="/api/achievements", tags=["achievements"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(focus.router, prefix="/api/focus", tags=["focus"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])


@app.on_event("startup")
def on_startup():
    init_db()
    # Seed only legacy demo data when no registered users exist (preserves first-run experience
    # without injecting fake accounts). Real user data is created by registered users.
    try:
        from app.database import get_db
        with get_db() as conn:
            user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if user_count == 0:
            seed_data()
    except Exception:
        pass

    provider = (os.getenv("AI_PROVIDER") or "").strip().lower() or "not set"
    key_configured = bool((os.getenv("AI_API_KEY") or "").strip())
    model = (os.getenv("AI_MODEL") or "").strip() or "(provider default)"
    print(
        f"[StudySphere] AI provider={provider} "
        f"api_key={'set' if key_configured else 'missing'} model={model}",
        flush=True,
    )
    if not key_configured:
        print(
            "[StudySphere] AI chat is read-only until AI_API_KEY is set in "
            "backend/.env and the server is restarted.",
            flush=True,
        )


@app.get("/api/health", tags=["health"])
def health():
    return {
        "status": "ok",
        "service": "smart-student-productivity-assistant",
        "frontend_served": (DIST_PATH / "index.html").is_file(),
    }


@app.get("/api/ready", tags=["health"])
def ready():
    # Lightweight readiness check; extend with DB/provider checks as needed.
    return {
        "status": "ready",
        "database": "sqlite" if os.getenv("DATABASE_URL", "").startswith("sqlite") or not os.getenv("DATABASE_URL") else "configured",
    }


def _resolve_dist_path() -> Path:
    candidates = [
        BACKEND_DIR.parent / "frontend" / "dist",
        Path.cwd() / "frontend" / "dist",
        Path.cwd() / "dist",
    ]
    for candidate in candidates:
        if (candidate / "index.html").is_file():
            return candidate
    return candidates[0]


DIST_PATH = _resolve_dist_path()
ASSETS_PATH = DIST_PATH / "assets"

if ASSETS_PATH.is_dir():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_PATH)), name="assets")


@app.get("/", include_in_schema=False)
async def read_root():
    index = DIST_PATH / "index.html"
    if index.is_file():
        return FileResponse(str(index))
    return {
        "detail": "Frontend not built. Run `cd frontend && npm run build` then restart the server.",
        "dist_path": str(DIST_PATH),
    }


@app.get("/{full_path:path}", include_in_schema=False)
async def spa_fallback(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    if full_path in ("docs", "openapi.json", "redoc"):
        raise HTTPException(status_code=404, detail="Not found")
    index = DIST_PATH / "index.html"
    if index.is_file():
        return FileResponse(str(index))
    raise HTTPException(status_code=404, detail="Frontend not built")