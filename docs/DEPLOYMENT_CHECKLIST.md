# HireStream — Production Deployment Checklist

Use this checklist before and after every production release to ensure complete operational reliability.

---

## 1. Pre-Deployment Verification

- [x] **Workspace Integrity:** All modifications performed on clean branch `production/hirestream-hardening`.
- [x] **Frontend Typecheck:** `npx tsc --noEmit` completes with 0 errors.
- [x] **Frontend Production Build:** `npm run build` succeeds with zero errors and all chunks under 400 kB.
- [x] **Frontend Linting:** `npm run lint` completes with 0 errors.
- [x] **Error Boundary Protection:** React `<ErrorBoundary>` installed at root level to prevent white-screen crashes.
- [x] **Safe Array Parsing:** All frontend `.map()` iterations protected with `safeArray` and `Array.isArray` checks.
- [x] **Backend Syntax & Import:** `import app.main` succeeds cleanly in Python 3.11 without blocking on storage or database.
- [x] **Automated Tests:** `pytest` suite passes with 100% success rate (14/14 tests passing).
- [x] **CORS Configuration:** Pydantic `ALLOWED_ORIGINS` validator successfully parses comma-separated URLs.
- [x] **PostgreSQL Dialect Support:** Database connection engine automatically normalizes `postgres://` to `postgresql://`.
- [x] **Container Build Readiness:** Backend Dockerfile verified without obsolete dependencies (`spacy`).
- [x] **Secrets Sanitization:** Zero hardcoded passwords, personal emails, or credentials committed into git history.

---

## 2. Cloud Provisioning (Render & Vercel)

### 2.1 Backend on Render
- [ ] Create Web Service on Render from GitHub repo `Hirestream` (branch `production/hirestream-hardening`).
- [ ] Set **Root Directory** to `hirestream/backend`.
- [ ] Set **Build Command** to `pip install -r requirements.txt`.
- [ ] Set **Start Command** to:
  `gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120`
- [ ] Attach PostgreSQL database URL to `DATABASE_URL`.
- [ ] Supply random 64-char string for `SECRET_KEY`.
- [ ] Add `ALLOWED_ORIGINS=https://<your-vercel-domain>.vercel.app,http://localhost:5173`.
- [ ] Verify build logs: `Application startup complete.`
- [ ] Query health probe: `curl -s https://<backend-url>.onrender.com/health`.

### 2.2 Frontend on Vercel
- [ ] Create Project on Vercel from GitHub repo `Hirestream` (branch `production/hirestream-hardening`).
- [ ] Set **Root Directory** to `hirestream/frontend`.
- [ ] Add environment variable `VITE_API_URL=https://<backend-url>.onrender.com`.
- [ ] Deploy and verify build completes with status **Ready**.

---

## 3. Post-Deployment Verification

- [ ] **Homepage Load:** Deployed Vercel URL opens immediately and displays hero banner and navigation.
- [ ] **No Blank Screens:** Navigating through `/login`, `/recruiter`, `/super-admin/login` renders smoothly.
- [ ] **API Communication:** Frontend successfully communicates with Render backend over HTTPS.
- [ ] **CORS Preflight:** No CORS errors in browser DevTools console during authentication or job fetching.
- [ ] **Database Connectivity:** Candidate registration and job browsing interact with PostgreSQL without errors.
- [ ] **Direct URL Navigation:** Refreshing nested routes (e.g. `/candidate`) loads SPA rather than a 404 page.
