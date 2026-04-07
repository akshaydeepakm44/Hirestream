from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

app = FastAPI(
    title="Enterprise Hiring Platform API",
    description="Full-stack ATS and hiring management platform",
    version="1.0.0"
)

# 0. Proxy Headers (MUST BE FIRST)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# 1. CORS Configuration (MUST BE BEFORE ROUTERS)
from app.core.config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 2. Database & Models Initialization (Conditional)
from app.database import engine, Base
from app import models # Force model registration

if getattr(settings, "AUTO_CREATE_DB", True):
    try:
        print("INITIALIZING DATABASE SCHEMA (AUTO)...")
        Base.metadata.create_all(bind=engine)
        print("DATABASE SCHEMA INITIALIZED SUCCESSFULLY.")
    except Exception as e:
        print(f"DATABASE INITIALIZATION FAILED: {str(e)}")
else:
    print("AUTO_CREATE_DB IS DISABLED. ENSURE MIGRATIONS ARE APPLIED.")

# 3. Mount Static Files
os.makedirs("uploads/resumes", exist_ok=True)
os.makedirs("data/resumes", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 4. Include Routers
from app.routers import auth, users, requisitions, applications, interviews, ats, jd_generator, rm, candidate_routes, hm_routes, file_routes, notifications, settings, candidate_profile, mail, public_routes, admin

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
app.include_router(settings.router)
app.include_router(candidate_profile.router)
app.include_router(mail.router)
app.include_router(public_routes.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "Enterprise Hiring Platform API", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}
