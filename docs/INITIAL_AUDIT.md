# HireStream — Initial Application Discovery & Engineering Audit

**Audit Date:** November 9, 2026  
**Auditor:** Principal Architecture & Production Release Engineering Team  
**Repository:** `https://github.com/akshaydeepakm44/Hirestream.git`  
**Target Hardening Workspace:** `D:\HireStream-Production-Upgrade`  
**Current Branch:** `production/hirestream-hardening` (branched from `main` @ commit `1a3545e`)

---

## 1. Executive Summary

HireStream is a multi-persona Enterprise Applicant Tracking System (ATS) and talent lifecycle management platform designed to automate job requisition authoring, candidate resume ingestion, automated ATS matching via TF-IDF vectorization and keyword scoring, multi-round interview scheduling with Google Meet/Calendar integration, and pre-onboarding document verification.

The application codebase possesses substantial domain modeling and functional implementation across four enterprise personas:
1. **Super Admin (SA)**: System governance, recruiter registration approval/rejection, company analytics, platform telemetry.
2. **Resource Manager (RM)**: Candidate sourcing, ATS resume parsing and scoring, pipeline progression, candidate assessment dispatch.
3. **Hiring Manager (HM)**: Job requisition creation, candidate interview evaluation, round scoring, hiring decisions.
4. **Candidate**: Public job discovery, 1-click application submission, application tracking, interview slot reception, document verification onboarding.

However, an audit of the repository, local setup, and cloud deployments reveals severe structural, runtime, and configuration defects that prevented the application from functioning in production:
- **Frontend Vercel Deployment:** Serves a blank white screen due to an uncaught runtime exception (`TypeError: jobs.map is not a function`) caused by SPA HTML rewrites falling into unvalidated API state without an Error Boundary.
- **Backend Render Deployment:** Erroneous configuration targeting and build scripts caused failure; Dockerfile builds crash due to uninstalled spacy model downloads (`python -m spacy download`); Pydantic CORS parsing crashes if `ALLOWED_ORIGINS` is provided as standard comma-separated strings; and startup hangs due to synchronous network calls to an unreachable hardcoded LAN IP (`http://192.168.0.9:9000`).
- **Repository Structure Mismatch:** Code is nested inside a subfolder `hirestream/`, leaving the repository root devoid of build scripts, `.gitignore`, or deployment blueprints, leading cloud providers (Vercel and Render) to misdetect build targets unless manually customized.
- **Testing & Quality:** Zero test suites (0 unit tests, 0 integration tests, 0 E2E tests), 139 ESLint errors, and widespread unchecked `any` types.

---

## 2. Technology Stack & Framework Inventory

### 2.1 Frontend Architecture
- **Framework & Runtime:** React 19 (`19.2.4`), React DOM (`19.2.4`)
- **Build Tool & Bundler:** Vite 7 (`7.3.1`) with `@vitejs/plugin-react` (`4.7.0`)
- **Language:** TypeScript 5.9 (`~5.9.3`) with strict checking enabled (`tsconfig.app.json`)
- **Styling & Design System:** Tailwind CSS v4 (`4.2.1`) using `@tailwindcss/vite` and `@tailwindcss/postcss`
- **Routing:** React Router DOM v7 (`7.13.1`) utilizing client-side HTML5 history routing (`BrowserRouter`)
- **Data Fetching & Cache:** TanStack React Query v5 (`5.95.2`) and Axios (`1.13.6`)
- **State Management:** Zustand (`5.0.12`) and React Context API (`AuthContext`, `ThemeContext`)
- **Icons & Animation:** Lucide React (`0.577.0`), Framer Motion (`12.38.0`)
- **Data Visualization:** Recharts (`3.8.0`)
- **Utilities:** `date-fns` (`4.1.0`), `clsx` (`2.1.1`), `tailwind-merge` (`3.5.0`)

### 2.2 Backend Architecture
- **Framework:** FastAPI (`0.110.0`), Starlette (`0.36.3`)
- **ASGI / WSGI Servers:** Uvicorn (`0.29.0`), Gunicorn (`21.2.0`)
- **Language & Runtime:** Python 3.11 (`3.11.18` / Astral CPython)
- **Object-Relational Mapping (ORM):** SQLAlchemy 2.0 (`2.0.29`)
- **Database Driver:** `psycopg2-binary` (`2.9.9`)
- **Database Migrations:** Alembic (`1.13.1`)
- **Validation & Settings:** Pydantic v2 (`2.6.4`), `pydantic-settings` (`2.2.1`), `email-validator` (`2.3.0`)
- **Authentication & Cryptography:** `python-jose[cryptography]` (`3.3.0`), `passlib[bcrypt]` (`1.7.4`), `bcrypt` (`4.0.1`)
- **Resume Processing & NLP:** `pdfplumber` (`0.11.0`), `scikit-learn` (`1.4.2`), `numpy` (`1.26.4`), `scipy` (`1.17.1`)
- **Cloud Storage Client:** `boto3` (`1.34.82`), `s3transfer` (`0.10.4`), MinIO S3 API
- **External Integrations:** Google Workspace APIs (`google-api-python-client` 2.201.0, `google-auth` 2.62.1, `google-auth-httplib2` 0.4.4) for Google Meet scheduling and Gmail dispatch.

---

## 3. Root Cause Investigation: Vercel White Screen

### 3.1 Mechanism of Failure
When visiting the deployed Vercel frontend, users encounter a completely blank white viewport. Our audit traced the exact failure path:

1. **Unconfigured Production API Base URL:**
   In `hirestream/frontend/src/api/client.ts`:
   ```typescript
   export const API_URL = import.meta.env.VITE_API_URL || '';
   export const api = axios.create({ baseURL: API_URL });
   ```
   In the deployed Vercel environment, `VITE_API_URL` was not supplied or defaulted to `''`.

2. **Vercel SPA Catch-All Rewrite Collision:**
   In `hirestream/frontend/vercel.json`:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
   When `baseURL` is empty, requests made by Axios (e.g., `api.get('/public/jobs')`) are issued directly to the Vercel hosting domain (`https://hirestream-*.vercel.app/public/jobs`).
   Because Vercel evaluates `/(.*)` before resolving non-existent backend routes, it returns HTTP 200 OK with the contents of `index.html` (MIME type: `text/html`).

3. **Silent Type Mutation in Component State:**
   In `hirestream/frontend/src/pages/LandingPage.tsx`:
   ```typescript
   const [jobs, setJobs] = useState<any[]>([]);

   useEffect(() => {
     api.get('/public/jobs')
       .then(res => setJobs(res.data))
       .catch(console.error);
   }, []);
   ```
   Axios receives the HTML string (`"<!doctype html>..."`). Because `res.data` is an HTML string, `setJobs(res.data)` mutates `jobs` from an Array into a `string`.

4. **Fatal Render Exception & Unhandled Crash:**
   In `LandingPage.tsx` line 195:
   ```typescript
   {jobs.length > 0 ? jobs.map(job => (
     <Card key={job.id} ...>...</Card>
   )) : (
     <div>No open roles available right now.</div>
   )}
   ```
   In JavaScript, strings have a `.length` property (`"<!doctype html>...".length` is ~470). Therefore `jobs.length > 0` evaluates to `true`.
   However, `String.prototype.map` is `undefined`. Evaluating `jobs.map(...)` throws:
   ```text
   Uncaught TypeError: jobs.map is not a function
   ```

5. **Lack of React Error Boundary:**
   In `hirestream/frontend/src/main.tsx`, the application root mounts without an Error Boundary:
   ```tsx
   <QueryClientProvider client={queryClient}>
     <ThemeProvider>
       <AuthProvider>
         <BrowserRouter>
           <App />
         </BrowserRouter>
       </AuthProvider>
     </ThemeProvider>
   </QueryClientProvider>
   ```
   Under React 19 rendering rules, any uncaught TypeError unmounts the entire component tree, leaving `<div id="root"></div>` empty. The browser displays a blank white screen.

---

## 4. Root Cause Investigation: Render Backend Deployment Errors

### 4.1 Deployment Failures
1. **Dockerfile Crash during Image Build:**
   In `hirestream/backend/Dockerfile`:
   ```dockerfile
   RUN pip install --no-cache-dir -r requirements.txt
   RUN python -m spacy download en_core_web_sm
   ```
   In commit `1a3545e`, `spacy` was removed from `requirements.txt`. When Render executes Docker build, line 19 fails immediately with:
   `/usr/local/bin/python: No module named spacy`.

2. **Repository Root Directory Misconfiguration:**
   Render creates services from the repository root by default. Because backend files reside in `hirestream/backend/`, a default build command (`pip install -r requirements.txt`) fails with `No such file or directory`.

3. **Pydantic v2 `ALLOWED_ORIGINS` Validation Failure:**
   In `hirestream/backend/app/core/config.py`:
   ```python
   ALLOWED_ORIGINS: list[str] = ["*"]
   ```
   In Pydantic v2, setting an environment variable like:
   `ALLOWED_ORIGINS=https://app.vercel.app,http://localhost:5173`
   causes Pydantic to raise `ValidationError: Input should be a valid list`. Pydantic v2 BaseSettings expects JSON syntax (`'["https://app.vercel.app"]'`) unless a pre-validator is defined.

4. **Database Connection String Incompatibility:**
   Render's managed PostgreSQL databases provide connection URLs formatted with `postgres://...` (e.g. `postgres://user:pass@host/db`).
   SQLAlchemy 2.0 strictly requires dialect specification `postgresql://...` or `postgresql+psycopg2://...`. Supplying `postgres://` raises `NoSuchModuleError: Unable to load plugin: sqlalchemy.dialects:postgres`.

5. **Blocking Network Calls at Module Import Time:**
   In `hirestream/backend/app/services/minio_client.py`:
   ```python
   if s3_client:
     ensure_buckets(['offer-letters', 'acceptance-letters', 'candidate-documents', 'experience-documents'])
   ```
   This code executes synchronously upon importing `app.main`. If `MINIO_ENDPOINT` is configured to `http://192.168.0.9:9000` (a local LAN address hardcoded in config), the server hangs for 30+ seconds during container initialization, exceeding cloud health check timeouts and causing Render deployment aborts.

---

## 5. Summary of Audit Findings & Next Steps

| Domain | Status | Key Discovery |
|---|---|---|
| **Workspace** | Configured | Established clean target at `D:\HireStream-Production-Upgrade` on branch `production/hirestream-hardening`. |
| **Frontend** | Vulnerable | React 19 blank screen triggered by missing Error Boundary and unsafe data parsing; 139 ESLint violations. |
| **Backend** | Broken Deploy | Dockerfile spacy error, synchronous MinIO import hang, Pydantic list env parsing flaw, PostgreSQL URL dialect mismatch. |
| **Database** | Functional Local | PostgreSQL schema operational locally; Alembic migration file `9f1de5e40e0c` out of sync with current model columns. |
| **Testing** | Non-existent | Zero test suites across backend and frontend. |
| **DevOps** | Incomplete | Subdirectory architecture unmapped at repository root; missing `render.yaml` blueprint. |

Phase 2 will remediate frontend routing, API client hardening, and Error Boundary installation. Phase 3 will remediate backend configuration, Dockerfile, and resilience. Phase 4 will audit database schemas. Phase 5 will conduct a comprehensive security review.
