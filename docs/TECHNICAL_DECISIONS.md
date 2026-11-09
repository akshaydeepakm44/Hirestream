# HireStream — Architecture & Technical Decisions (ADR)

This document records the key architectural choices, trade-offs, and rationale adopted during the production upgrade of HireStream.

---

## ADR-01: React 19 Client-Side Routing with Vercel SPA Fallback & Defensive Interceptors

### Context
When hosting a client-side Single Page Application (SPA) on Vercel, requests to arbitrary routes (e.g. `/candidate`, `/jobs/12`) return 404 unless routed to `/index.html`. However, catch-all rewrites (`/(.*) -> /index.html`) cause requests to unconfigured or missing API endpoints to return HTTP 200 with HTML instead of HTTP 404/500 JSON, corrupting frontend state and triggering white-screen crashes.

### Decision
1. Retain `vercel.json` rewrite to `/index.html` for client-side routing.
2. Install a global React `ErrorBoundary` at the application root in `main.tsx`.
3. Introduce an Axios response interceptor that inspects Content-Type and rejects HTML responses on API routes with descriptive errors.
4. Coerce all array responses using `safeArray<T>()`.

### Consequences
- **Positive:** Seamless SPA routing on page reloads; zero unhandled crashes; user-friendly fallback screen if errors occur.
- **Negative:** Slight overhead in checking response types before parsing.

---

## ADR-02: Non-Blocking Object Storage Architecture with Local Filesystem Fallback

### Context
Cloud ATS deployments often require S3/MinIO for document storage (resumes, offer letters, identity proofs). However, hardcoding LAN endpoints (`192.168.0.9`) or attempting synchronous bucket creation at module import causes severe startup hangs (30+ seconds), exceeding cloud health probe deadlines and crashing deployments on Render.

### Decision
1. Make S3/MinIO initialization lazy and conditional on explicit endpoint presence.
2. Implement seamless local disk fallback: if MinIO is not configured or fails to respond within 3 seconds, all file operations automatically route to local disk storage (`uploads/`).
3. Expose presigned upload URLs when S3 is present, and direct upload endpoints when in local fallback mode.

### Consequences
- **Positive:** Zero startup latency; immediate health-check response; system functions in any environment (local dev, air-gapped test, cloud production) without requiring a running MinIO cluster.
- **Negative:** Local files are ephemeral on free-tier containers unless a persistent disk volume is mounted.

---

## ADR-03: Pydantic v2 String/List Polymorphism for CORS Origins

### Context
In Pydantic v2 BaseSettings, defining `ALLOWED_ORIGINS: list[str]` causes runtime validation crashes if the cloud hosting environment passes a comma-delimited string (e.g. `ALLOWED_ORIGINS="https://app.vercel.app,http://localhost:5173"`).

### Decision
Adopt a pre-validation `@field_validator("ALLOWED_ORIGINS", mode="before")` that inspects input types:
- If a comma-separated string, splits by `,` and strips whitespace.
- If a JSON array string (`'["..."]'`), parses via `json.loads`.
- If already a list or iterable, validates items directly.

### Consequences
- **Positive:** Complete tolerance for various cloud provider environment variable formatting styles; zero crash on deploy.

---

## ADR-04: Database Engine Dialect Normalization & Connection Health Pooling

### Context
PostgreSQL instances on cloud PaaS providers (Render, Supabase, Neon) frequently emit connection URLs with the legacy `postgres://` prefix. SQLAlchemy 2.0 strictly requires `postgresql://` and crashes with `NoSuchModuleError`. In addition, serverless or paused cloud databases frequently drop idle TCP sockets, producing `SSL SYSCALL error: EOF detected` on subsequent requests.

### Decision
1. Programmatically replace `postgres://` with `postgresql://` in `app/core/config.py` and `app/database.py`.
2. Enable `pool_pre_ping=True` and `pool_recycle=300` on the SQLAlchemy engine.

### Consequences
- **Positive:** 100% cloud database compatibility; zero dropped-connection errors; automatic reconnection on wake.

---

## ADR-05: Route-Based Code Splitting via React.lazy and Rollup Chunk Stratification

### Context
The initial Vite bundle was a monolithic 1.28 MB JavaScript bundle, forcing public visitors on the landing page to download heavy dashboard code, Recharts charting libraries, and recruiter management tables.

### Decision
1. Code-split all four heavy dashboard apps using `React.lazy()` and `Suspense`.
2. Stratify vendor dependencies into distinct Rollup chunks: `vendor-react`, `vendor-ui`, `vendor-charts`, and `vendor-data`.

### Consequences
- **Positive:** Initial landing page bundle reduced to 319 kB (75% reduction); faster Time to Interactive (TTI); browser cache reuse across releases.
