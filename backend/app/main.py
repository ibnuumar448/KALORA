from dotenv import load_dotenv
load_dotenv()

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth # <-- ADD THIS IMPORT

app = FastAPI(title="KALORA API", version="0.1.0")
cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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