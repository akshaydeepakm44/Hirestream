# HireStream — Production Environment Variables Reference

This document lists all environment variables used by the HireStream platform across the Frontend and Backend services.

> [!CAUTION]
> Never commit actual values or credentials into version control. Set these values exclusively through cloud provider dashboards (Vercel Project Settings, Render Environment).

---

## 1. Frontend Environment Variables (Vercel)

| Variable | Scope | Required | Description |
|---|---|:---:|---|
| `VITE_API_URL` | Client Build | **Yes** | Fully qualified URL of the deployed backend. Example: `https://hirestream-backend.onrender.com`. If missing, the app defaults to empty string and emits a warning in production. |

---

## 2. Backend Environment Variables (Render)

### 2.1 Database & Persistence
| Variable | Required | Default | Description |
|---|:---:|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://postgres:password@localhost:5432/hiring_platform` | PostgreSQL connection string. Supports `postgres://` or `postgresql://`. Auto-normalized. |
| `AUTO_CREATE_DB` | No | `true` | When `true`, automatically creates missing tables on startup via SQLAlchemy metadata. Set to `false` if managing via Alembic only. |

### 2.2 Security & Authentication
| Variable | Required | Default | Description |
|---|:---:|---|---|
| `SECRET_KEY` | **Yes** | (None in prod) | Cryptographic secret used for signing HMAC-SHA256 JWT tokens. Must be minimum 32 characters. |
| `ALGORITHM` | No | `HS256` | JWT signing algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | Token expiration duration in minutes (default is 24 hours). |
| `ALLOWED_ORIGINS` | **Yes** | `*` | Comma-separated list or JSON array of allowed origins for CORS. Example: `https://hirestream.vercel.app,http://localhost:5173`. |

### 2.3 Host & Networking
| Variable | Required | Default | Description |
|---|:---:|---|---|
| `BACKEND_URL` | **Yes** | `http://localhost:8000` | The public base URL of the backend service. Used to generate file download links. |
| `FRONTEND_URL` | **Yes** | `http://localhost:5173` | The public base URL of the frontend SPA. Used for OAuth redirects. |
| `PORT` | Auto | `8000` | Server listening port. Provided automatically by Render. |
| `PYTHON_VERSION` | No | `3.11.9` | Pinned Python runtime on Render. |

### 2.4 Storage Configuration (MinIO / S3)
| Variable | Required | Default | Description |
|---|:---:|---|---|
| `UPLOAD_DIR` | No | `uploads/resumes` | Local filesystem directory for fallback file storage. |
| `MINIO_ENDPOINT` | No | `None` | S3/MinIO endpoint URL (e.g. `https://s3.amazonaws.com` or custom MinIO). If omitted or empty, local disk storage is used. |
| `MINIO_ACCESS_KEY` | No | `minioadmin` | AWS/MinIO access key ID. |
| `MINIO_SECRET_KEY` | No | `minioadmin` | AWS/MinIO secret access key. |
| `MINIO_BUCKET` | No | `uploads` | Default S3 bucket name. |

### 2.5 Google Workspace Integration (Optional)
| Variable | Required | Default | Description |
|---|:---:|---|---|
| `GOOGLE_CLIENT_ID` | No | `None` | Google Cloud Console OAuth 2.0 Web Client ID. |
| `GOOGLE_CLIENT_SECRET` | No | `None` | Google Cloud Console OAuth 2.0 Client Secret. |
| `GOOGLE_REDIRECT_URI` | No | `None` | Authorized OAuth redirect callback URL (e.g. `https://hirestream-backend.onrender.com/auth/google/callback`). |
| `GOOGLE_CALENDAR_ID` | No | `primary` | Google Calendar ID for interview scheduling. |
