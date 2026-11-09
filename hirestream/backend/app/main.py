from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
from sqlalchemy import text
import os
import traceback

from app.core.config import settings
from app.database import engine, Base
from app import models  # Force model registration

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Database schema auto-creation if enabled
    if getattr(settings, "AUTO_CREATE_DB", True):
        try:
            print("[STARTUP] Auto-initializing database schema...")
            Base.metadata.create_all(bind=engine)
            print("[STARTUP] Database schema verified successfully.")
        except Exception as e:
            print(f"[STARTUP WARNING] Database initialization failed: {str(e)}")
    else:
        print("[STARTUP] AUTO_CREATE_DB disabled; relying on Alembic migrations.")
    
    # Ensure local upload directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs("uploads/resumes", exist_ok=True)
    os.makedirs("data/resumes", exist_ok=True)
    
    yield
    
    # Shutdown
    print("[SHUTDOWN] Application terminating gracefully.")

app = FastAPI(
    title="HireStream Enterprise ATS API",
    description="Full-stack Enterprise Applicant Tracking System & Talent Acquisition Platform",
    version="1.0.0",
    lifespan=lifespan
)

# 0. Proxy Headers Middleware (Essential for Render / Reverse Proxy HTTPS detection)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# 1. CORS Configuration
cors_origins = settings.ALLOWED_ORIGINS
print(f"[SECURITY] Configuring CORS with allowed origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 2. Centralized Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail,
            "status_code": exc.status_code,
            "path": request.url.path
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    simplified_errors = [
        {"field": " -> ".join(str(loc) for loc in err.get("loc", [])), "message": err.get("msg")}
        for err in errors
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "error",
            "message": "Validation failed for request parameters",
            "errors": simplified_errors,
            "status_code": 422,
            "path": request.url.path
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    print(f"[UNHANDLED EXCEPTION] {request.method} {request.url.path}: {str(exc)}")
    print(traceback.format_exc())
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "Internal server error. Please try again later.",
            "status_code": 500,
            "path": request.url.path
        }
    )

# 3. Mount Static Files
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 4. Include Routers
from app.routers import (
    auth, users, requisitions, applications, interviews,
    ats, jd_generator, rm, candidate_routes, hm_routes,
    file_routes, notifications, settings as settings_router,
    candidate_profile, mail, public_routes, admin
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(requisitions.router)
app.include_router(applications.router)
app.include_router(interviews.router)
app.include_router(ats.router)
app.include_router(jd_generator.router)
app.include_router(rm.router)
app.include_router(candidate_routes.router)
app.include_router(hm_routes.router)
app.include_router(file_routes.router)
app.include_router(notifications.router)
app.include_router(settings_router.router)
app.include_router(candidate_profile.router)
app.include_router(mail.router)
app.include_router(public_routes.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {
        "service": "HireStream Enterprise API",
        "version": "1.0.0",
        "status": "online",
        "documentation": "/docs"
    }

@app.get("/health")
def health():
    db_healthy = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_healthy = True
    except Exception as db_err:
        print(f"[HEALTH CHECK] Database ping failed: {db_err}")
        db_healthy = False

    return {
        "status": "healthy" if db_healthy else "degraded",
        "service": "HireStream API",
        "version": "1.0.0",
        "database": "connected" if db_healthy else "unreachable",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
