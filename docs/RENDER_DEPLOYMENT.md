# HireStream — Render Production Deployment Guide

## 1. Overview

The HireStream backend is an asynchronous Python service built with FastAPI, SQLAlchemy 2.0, and Pydantic v2.  
This guide documents the exact configuration required to deploy the backend to Render using either the native Python runtime or Docker.

---

## 2. Option A: Native Python Web Service (Recommended)

### 2.1 Render Dashboard Settings

Create a new **Web Service** on Render connected to `https://github.com/akshaydeepakm44/Hirestream.git`:

| Setting | Value | Notes |
|---|---|---|
| **Name** | `hirestream-backend` | Service identifier |
| **Region** | Choose closest to your users | e.g. Oregon, Frankfurt, Singapore |
| **Branch** | `production/hirestream-hardening` (or `main`) | Production release branch |
| **Root Directory** | `hirestream/backend` | **Critical:** Must target the backend subfolder |
| **Runtime** | `Python 3` | Python 3.11+ |
| **Build Command** | `pip install -r requirements.txt` | Installs FastAPI, SQLAlchemy, Scikit-Learn |
| **Start Command** | `gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120` | Dynamic binding to Render's `$PORT` |
| **Health Check Path** | `/health` | Monitored by Render orchestrator |

---

## 3. Option B: Infrastructure-as-Code via `render.yaml`

A pre-configured `render.yaml` blueprint is present at the repository root.  
In the Render dashboard, navigate to **Blueprints > New Blueprint Instance**, select your HireStream repository, and Render will automatically provision:
1. Managed PostgreSQL database (`hirestream-db`).
2. FastAPI web service (`hirestream-backend`) with automatic database linking and secret generation.

---

## 4. Production Environment Variables (Render)

Configure the following under **Environment** in the Render service:

| Variable | Required | Example Value | Description |
|---|:---:|---|---|
| `PYTHON_VERSION` | Yes | `3.11.9` | Pins Python version in Render build container |
| `DATABASE_URL` | Yes | `postgresql://user:pass@ep-host.render.com/hiring_platform` | Managed PostgreSQL connection string (auto-normalized) |
| `AUTO_CREATE_DB` | Yes | `true` | Initializes ORM tables on cold start |
| `SECRET_KEY` | Yes | `<64-char random string>` | Used for signing JWT authentication tokens |
| `ALGORITHM` | Yes | `HS256` | JWT cryptographic algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | `1440` | Token expiration (24 hours) |
| `ALLOWED_ORIGINS` | Yes | `https://hirestream.vercel.app,http://localhost:5173` | Comma-separated list of authorized origins |
| `BACKEND_URL` | Yes | `https://hirestream-backend.onrender.com` | Public URL of this service |
| `FRONTEND_URL` | Yes | `https://hirestream.vercel.app` | Public URL of the frontend |
| `UPLOAD_DIR` | No | `uploads/resumes` | Directory for local fallback storage |
| `MINIO_ENDPOINT` | No | (Leave blank if not using S3) | Uses resilient local storage if omitted |
| `GOOGLE_CLIENT_ID` | No | `your-id.apps.googleusercontent.com` | Optional Google Meet/OAuth integration |
| `GOOGLE_CLIENT_SECRET` | No | `your-secret` | Optional Google Meet/OAuth integration |
| `GOOGLE_REDIRECT_URI` | No | `https://hirestream-backend.onrender.com/auth/google/callback` | OAuth callback target |

---

## 5. Deployment Verification Checklist

1. **Service Log Verification:**
   Check the live logs on Render:
   - `[DATABASE] Initializing engine with: postgresql://...`
   - `[SECURITY] Configuring CORS with allowed origins: ['https://hirestream.vercel.app', ...]`
   - `[STARTUP] Database schema verified successfully.`
   - `Application startup complete.`
2. **Health Probe Verification:**
   Run in your terminal or browser:
   ```bash
   curl -i https://hirestream-backend.onrender.com/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "service": "HireStream API",
     "version": "1.0.0",
     "database": "connected",
     "timestamp": "2026-11-09T..."
   }
   ```
3. **Interactive Documentation:**
   Navigate to `https://hirestream-backend.onrender.com/docs` to verify OpenAPI Swagger documentation is operational.
