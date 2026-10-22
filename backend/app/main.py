from dotenv import load_dotenv
load_dotenv()

import logging
import os
from urllib.parse import urlsplit

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from app.api.v1 import auth # <-- ADD THIS IMPORT
from app.core.database import engine

app = FastAPI(title="KALORA API", version="0.1.0")
logger = logging.getLogger(__name__)


def get_cors_origins() -> list[str]:
    configured_origins = os.getenv("CORS_ALLOWED_ORIGINS")
    if not configured_origins:
        raise RuntimeError(
            "CORS_ALLOWED_ORIGINS is required. Configure the frontend origin "
            "for this environment."
        )

    origins = [origin.strip() for origin in configured_origins.split(",")]
    if not origins or any(not origin for origin in origins):
        raise RuntimeError(
            "CORS_ALLOWED_ORIGINS must be a comma-separated list of origins."
        )

    normalized_origins = []
    is_render = os.getenv("RENDER", "").lower() == "true"
    for origin in origins:
        parsed = urlsplit(origin)
        try:
            parsed.port
        except ValueError as exc:
            raise RuntimeError(
                "CORS_ALLOWED_ORIGINS entries must use valid HTTP(S) origins."
            ) from exc
        if (
            "*" in origin
            or parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.username
            or parsed.password
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
        ):
            raise RuntimeError(
                "CORS_ALLOWED_ORIGINS entries must be explicit HTTP(S) origins "
                "without paths, credentials, query strings, or wildcards."
            )
        if is_render and parsed.scheme != "https":
            raise RuntimeError(
                "CORS_ALLOWED_ORIGINS entries must use HTTPS in production."
            )
        normalized_origins.append(f"{parsed.scheme}://{parsed.netloc}")

    return normalized_origins


cors_origins = get_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

from app.api.v1 import applications, students, curriculum, assessments, progress, mentors, admin, discipline, settings, mentorship, notifications, users, contact
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1")
app.include_router(students.router, prefix="/api/v1") 
app.include_router(curriculum.router, prefix="/api/v1")
app.include_router(assessments.router, prefix="/api/v1")
app.include_router(progress.router, prefix="/api/v1")
app.include_router(mentors.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(discipline.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")
app.include_router(mentorship.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(contact.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "kalora-backend"}


@app.get("/health/ready")
def readiness_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error(
            "Database readiness check failed (%s)", type(exc).__name__
        )
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready"},
        )

    return {"status": "ready"}
