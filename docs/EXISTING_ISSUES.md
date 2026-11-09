# HireStream — Comprehensive Existing Issues Register

**Audit & Assessment Date:** November 9, 2026  
**Document Classification:** Internal Technical Audit & Production Readiness Register  
**Total Issues Identified:** 16  
- **Critical:** 4  
- **High:** 5  
- **Medium:** 4  
- **Low:** 3  

---

## 1. Issue Classification Matrix

| ID | Title | Severity | Impacted Area | Status |
|---|---|:---:|---|:---:|
| **ISSUE-01** | Frontend Uncaught Exception on SPA HTML Fallback (White Screen) | **CRITICAL** | Frontend Core / LandingPage | Confirmed |
| **ISSUE-02** | Absence of Global React Error Boundary | **CRITICAL** | Frontend Application Root | Confirmed |
| **ISSUE-03** | Dockerfile Build Failure due to Missing `spacy` Model Dependency | **CRITICAL** | Backend Containerization | Confirmed |
| **ISSUE-04** | Synchronous Blocking Network I/O on Module Import (`minio_client`) | **CRITICAL** | Backend Startup / Readiness | Confirmed |
| **ISSUE-05** | Pydantic v2 `ALLOWED_ORIGINS` Validation Failure from String Envs | **HIGH** | Backend Security / CORS | Confirmed |
| **ISSUE-06** | PostgreSQL Dialect Incompatibility with Managed Cloud DBs (`postgres://`) | **HIGH** | Database Connection / Persistence | Confirmed |
| **ISSUE-07** | Subdirectory Repository Structure Mismatch for Cloud Providers | **HIGH** | DevOps / Vercel & Render Config | Confirmed |
| **ISSUE-08** | Complete Lack of Automated Test Suites (0 Unit, 0 Integration, 0 E2E) | **HIGH** | Quality Assurance / Verification | Confirmed |
| **ISSUE-09** | 139 ESLint Errors & Unsafe Widespread `any` Types | **HIGH** | Frontend Code Quality | Confirmed |
| **ISSUE-10** | Database Seeder Script Executes Destructive Drops in Non-Guarded Manner | **MEDIUM** | Database Safety | Confirmed |
| **ISSUE-11** | Hardcoded Developer Credentials and Personal Emails in Utility Scripts | **MEDIUM** | Security / Data Privacy | Confirmed |
| **ISSUE-12** | Database Migration Out of Sync with Current ORM Model Schema | **MEDIUM** | Database Versioning / Alembic | Confirmed |
| **ISSUE-13** | Lack of Centralized Exception Handling Middleware | **MEDIUM** | Backend API Consistency | Confirmed |
| **ISSUE-14** | Missing Root Level `.gitignore` and Deployment Blueprints | **LOW** | Repository Hygiene | Confirmed |
| **ISSUE-15** | Default Vite Starter Assets and Dead Boilerplate in Source Tree | **LOW** | Bundle Size / Cleanliness | Confirmed |
| **ISSUE-16** | Absence of Automated Health Probe Metrics in `/health` Endpoint | **LOW** | Observability / Production Ops | Confirmed |

---

## 2. Detailed Issue Analysis

### ISSUE-01 (CRITICAL)
- **Title:** Frontend Uncaught Exception on SPA HTML Fallback (White Screen)
- **Component:** `hirestream/frontend/src/pages/LandingPage.tsx`, `api/client.ts`
- **Root Cause:** When `VITE_API_URL` is omitted or points to the Vercel domain, `api.get('/public/jobs')` triggers Vercel's SPA rewrite (`/(.*) -> /index.html`). Axios receives HTTP 200 with raw HTML (`"<!doctype html>..."`). The response is directly assigned to `jobs` state without verifying `Array.isArray(res.data)`. In the JSX template, evaluating `jobs.map(...)` on a string throws `TypeError: jobs.map is not a function`.
- **Evidence:**
  `hirestream/frontend/src/pages/LandingPage.tsx`: Line 21 & 195.
- **Impact:** Complete failure to render the application. Users see a blank white screen.
- **Remediation:**
  1. Enforce strict array validation (`setJobs(Array.isArray(res.data) ? res.data : [])`).
  2. Implement Axios response interceptor that detects non-JSON Content-Types on API endpoints and rejects with clear errors.
  3. Provide default mock/fallback data so the landing page renders gracefully even when backend connectivity is temporarily down.

---

### ISSUE-02 (CRITICAL)
- **Title:** Absence of Global React Error Boundary
- **Component:** `hirestream/frontend/src/main.tsx`
- **Root Cause:** React 19 unmounts the entire component tree when an uncaught render error occurs if no Error Boundary exists above the offending component.
- **Evidence:** `main.tsx` mounts `<QueryClientProvider>`, `<ThemeProvider>`, `<AuthProvider>`, and `<BrowserRouter>` directly without any `<ErrorBoundary>`.
- **Impact:** Any component crash produces a catastrophic white-screen crash without error reporting or user recovery options.
- **Remediation:** Implement a production-grade React Error Boundary with fallback UI, reset buttons, and console error logging.

---

### ISSUE-03 (CRITICAL)
- **Title:** Dockerfile Build Failure due to Missing `spacy` Model Dependency
- **Component:** `hirestream/backend/Dockerfile`
- **Root Cause:** Line 19 of `Dockerfile` specifies `RUN python -m spacy download en_core_web_sm`. However, commit `1a3545e` removed `spacy` from `requirements.txt`.
- **Evidence:**
  `hirestream/backend/Dockerfile:19`: `RUN python -m spacy download en_core_web_sm`  
  `hirestream/backend/requirements.txt`: does not contain `spacy`.
- **Impact:** Any Docker-based build on Render or local container engines crashes immediately during build time.
- **Remediation:** Remove obsolete Spacy model download from `Dockerfile` and ensure all container build instructions strictly mirror `requirements.txt`.

---

### ISSUE-04 (CRITICAL)
- **Title:** Synchronous Blocking Network I/O on Module Import (`minio_client`)
- **Component:** `hirestream/backend/app/services/minio_client.py`
- **Root Cause:** At the bottom of `minio_client.py`, `ensure_buckets()` executes during Python module import. If `MINIO_ENDPOINT` is unavailable (e.g. pointing to `192.168.0.9:9000`), the process blocks for 30+ seconds waiting for socket timeout.
- **Evidence:**
  `minio_client.py:171`: `if s3_client: ensure_buckets([...])`
- **Impact:** Server startup hangs; Render web services fail health checks before the socket opens.
- **Remediation:** Defer bucket verification to FastAPI lifespan startup or lazy-initialize it on the first storage write request.

---

### ISSUE-05 (HIGH)
- **Title:** Pydantic v2 `ALLOWED_ORIGINS` Validation Failure from String Envs
- **Component:** `hirestream/backend/app/core/config.py`
- **Root Cause:** `ALLOWED_ORIGINS: list[str] = ["*"]` in Pydantic v2 BaseSettings expects a JSON list string in environment variables (e.g. `'["https://app.vercel.app"]'`). If passed as standard comma-separated strings (`https://app.vercel.app,http://localhost:5173`), Pydantic throws a `ValidationError`.
- **Evidence:** `hirestream/backend/app/core/config.py:27`.
- **Impact:** Backend crashes on startup when configured with comma-separated origins in Render environment settings.
- **Remediation:** Add a `@field_validator("ALLOWED_ORIGINS", mode="before")` to parse comma-separated strings into lists of clean strings.

---

### ISSUE-06 (HIGH)
- **Title:** PostgreSQL Dialect Incompatibility with Managed Cloud DBs (`postgres://`)
- **Component:** `hirestream/backend/app/database.py`
- **Root Cause:** Render and other cloud databases generate connection strings beginning with `postgres://`. SQLAlchemy 2.0 requires `postgresql://`.
- **Evidence:** `hirestream/backend/app/database.py:7`: `engine = create_engine(settings.DATABASE_URL)`.
- **Impact:** Immediate crash with `NoSuchModuleError` when deploying against cloud PostgreSQL instances.
- **Remediation:** Normalize `DATABASE_URL` in `database.py` to replace `postgres://` with `postgresql://`, and configure robust connection pool settings (`pool_pre_ping=True`).

---

### ISSUE-07 (HIGH)
- **Title:** Subdirectory Repository Structure Mismatch for Cloud Providers
- **Component:** Repository Root
- **Root Cause:** The repository encapsulates all backend and frontend code inside `hirestream/`. Neither Vercel nor Render auto-detects subdirectories without explicit root directory configuration or blueprint descriptors.
- **Evidence:** Repository root contains only `.python-version` and directory `hirestream/`.
- **Impact:** Cloud providers fail to find `package.json` or `requirements.txt` unless manually customized.
- **Remediation:** Provide standard root-level configuration files (`render.yaml`, root `.gitignore`, root documentation links, and explicit deployment guides).

---

### ISSUE-08 (HIGH)
- **Title:** Complete Lack of Automated Test Suites (0 Unit, 0 Integration, 0 E2E)
- **Component:** Backend & Frontend
- **Root Cause:** No test files exist anywhere in the repository.
- **Impact:** Inability to verify regressions, assert API contract stability, or demonstrate engineering rigor.
- **Remediation:** Configure `pytest` with `pytest-asyncio` and `httpx` for backend API integration tests; configure Vitest / React Testing Library for frontend component testing.

---

### ISSUE-09 (HIGH)
- **Title:** 139 ESLint Errors & Unsafe Widespread `any` Types
- **Component:** Frontend Source Code
- **Root Cause:** `eslint .` fails with 139 errors, largely consisting of `@typescript-eslint/no-explicit-any`, `react-hooks/set-state-in-effect`, and unused variable errors.
- **Evidence:** `npm run lint` exits with code 1 and 139 errors.
- **Impact:** Build failure on strict CI pipelines and compromised type safety.
- **Remediation:** Refactor `any` usages into explicit domain interfaces in `src/types/index.ts`, fix hook side-effects, and clean unused variables.
