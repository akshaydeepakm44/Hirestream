# Hirestream Enterprise ATS — Complete Interview Preparation Guide

---

## 1. Project Overview & 30-Second Elevator Pitch

### What is Hirestream?
**Hirestream** is a production-grade, enterprise **Applicant Tracking System (ATS)** and talent acquisition management platform. It automates and streamlines the complete recruiting lifecycle—from job requisition creation and automated resume parsing to algorithmic ATS scoring, multi-round interview scheduling with Google Meet integration, and pre-onboarding document verification.

### The 30-Second Elevator Pitch (For Interviewers)
> *"Hirestream is a full-stack Enterprise Applicant Tracking System built with FastAPI, PostgreSQL, and React. It solves the inefficiency of manual resume screening by introducing an automated ATS matching engine that uses TF-IDF vectorization and skill-taxonomy extraction to rank candidates against job requirements. The system enforces strict enterprise Role-Based Access Control (RBAC) across four distinct personas—Super Admins, Resource Managers, Hiring Managers, and Candidates—while handling document management through S3/MinIO and automated interview scheduling through Google Workspace integration."*

---

## 2. System Architecture & Tech Stack

```
[ Frontend: React 19 + TypeScript + Vite 7 + TailwindCSS 4 ]
                      │  (REST JSON / Bearer JWT)
                      ▼
[ API Gateway & Security: FastAPI + Pydantic v2 + OAuth2 JWT ]
                      │
   ┌──────────────────┼─────────────────────────┐
   ▼                  ▼                         ▼
[ ATS Engine ]  [ Google API ]        [ Storage Service ]
- pdfplumber    - OAuth2              - MinIO (S3 Presigned URLs)
- Scikit-Learn  - Calendar & Meet     - Local Disk Fallback
- TF-IDF NLP    - Gmail Integration
   │                  │                         │
   └──────────────────┼─────────────────────────┘
                      ▼
[ Persistence Layer: PostgreSQL 16/18 + SQLAlchemy 2.0 ORM ]
- Core Tables: Users, Candidates, Requisitions, Applications, Interviews
- Audit Logging: ApplicationStatusHistory
```

### Full Stack Breakdown

| Layer | Technologies Used | Key Reason for Selection |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 7, TailwindCSS 4 | High-performance SPA with modern React hooks, sub-second HMR, and utility-first styling. |
| **UI & UX** | Framer Motion, Lucide Icons, Recharts | Smooth dashboard micro-interactions, responsive data visualizations for analytics. |
| **Frontend State** | TanStack React Query, Zustand, Axios | Server-state caching, optimistic updates, and automatic Bearer JWT injection via interceptors. |
| **Backend API** | FastAPI (Python 3.11), Uvicorn, Pydantic v2 | High throughput async REST API, auto OpenAPI/Swagger docs, strict runtime type validation. |
| **Database & ORM**| PostgreSQL, SQLAlchemy 2.0, Alembic | ACID-compliant relational storage, declarative data models, structured schema migrations. |
| **ATS / ML Engine** | Scikit-Learn, NumPy, pdfplumber | In-memory text extraction from PDF resumes, TF-IDF vectorization, cosine similarity. |
| **Object Storage**| MinIO (S3 API) + Local Filesystem Fallback | Cloud-native asset storage for resumes and compliance documents with offline resilience. |
| **Third-Party** | Google Workspace APIs (OAuth2, Calendar, Gmail) | Automated interview invitations with Google Meet video links and transactional candidate emails. |

---

## 3. Enterprise Role-Based Access Control (RBAC)

The system is strictly segregated into **4 distinct personas**. Each role has its own dedicated dashboard, route guards, and business permissions:

### 1. Super Admin (`super_admin`)
- **Primary Goal**: System oversight, security compliance, and user governance.
- **Key Capabilities**:
  - Approves or rejects newly registered Resource Managers and Hiring Managers before they can access company data.
  - Monitors high-level recruiting metrics, active requisitions, system health, and audit logs.
  - Can activate, deactivate, or reassign user permissions across the platform.

### 2. Resource Manager (`resource_manager`)
- **Primary Goal**: Talent pipeline sourcing and requisition management.
- **Key Capabilities**:
  - Creates, publishes, and edits job requisitions.
  - Sourcing candidates: Manages candidate intake, uploads resumes on behalf of candidates, and reviews applicants.
  - Reviews automated ATS match scores and missing skill breakdowns.
  - Advances applications through the pipeline (`sourcing` -> `screening` -> `internal_shortlist` -> `ready_for_hm`).
  - Oversees post-selection document verification (`experience_verified`, `relieving_verified`, `payslips_verified`).

### 3. Hiring Manager (`hiring_manager`)
- **Primary Goal**: Technical evaluation, interview conduction, and final hiring decisions.
- **Key Capabilities**:
  - Receives candidates handed off by the RM (`ready_for_hm`).
  - Evaluates resume text, portfolio links, and parsed candidate profiles.
  - Schedules multi-round interviews with automated Google Meet links and calendar invites.
  - Submits structured interview feedback, ratings, and moves candidates to `offer_extended` or `rejected`.

### 4. Candidate (`candidate`)
- **Primary Goal**: Job discovery, application submission, and status tracking.
- **Key Capabilities**:
  - Browses open positions on the public job board.
  - Self-registers, builds profile (education, experience, contact details), and uploads PDF resume.
  - Real-time application tracker showing the active stage (e.g., *Under Review*, *Interview Scheduled*, *Offer Extended*).
  - Receives interview schedules, meeting links, and offer letters.

---

## 4. End-to-End Application Lifecycle & Workflow

1. **Job Requisition Creation**:
   - Resource Manager (or Hiring Manager) creates a job posting with department, title, required skills, and job description.
   - Status is set to `open`.
2. **Sourcing & Candidate Application**:
   - Candidate registers and applies, uploading their PDF resume.
   - The backend runs `extract_text_from_resume()` using `pdfplumber` directly from memory bytes.
   - The ATS engine computes the match score and extracts missing skills.
   - Application status begins at `sourcing`.
3. **Screening & Internal Shortlist**:
   - Resource Manager reviews the pipeline, inspecting the automated ATS score and skill gaps.
   - RM moves the candidate through `screening` -> `internal_shortlist`.
   - Once qualified, RM sets status to `ready_for_hm` (handoff to Hiring Manager).
4. **Interview Scheduling & Decision**:
   - Hiring Manager receives shortlisted candidates in their dashboard.
   - HM schedules an interview (date, time, mode).
   - The system triggers the Google Calendar integration, creating a calendar invite with an auto-generated Google Meet video link.
   - After the interview, HM submits feedback and either moves candidate to `offer_extended` or `rejected`.
5. **Document Verification & Onboarding**:
   - RM collects and verifies compliance documents (`payslips_verified`, `relieving_verified`, `experience_verified`).
   - Final status transitions to `hired`.

---

## 5. Technical Deep Dives (Interview Highlights)

### Deep Dive 1: The ATS Matching Algorithm (`ats_service.py`)
**How does the ATS score work?**
The scoring engine combines **Natural Language Processing (NLP)** text similarity with **deterministic skill-gap analysis**:

1. **Text Extraction**: Uses `pdfplumber` to extract structured text directly from PDF binary bytes.
2. **Text Normalization**: Regex cleans whitespace, lowercases all tokens, and strips punctuation.
3. **TF-IDF Cosine Similarity (30% weight)**:
   - Uses Scikit-Learn's `TfidfVectorizer(stop_words='english', max_features=5000)`.
   - Constructs TF-IDF vectors for both the Resume and the Job Description.
   - Computes cosine similarity between vectors.
4. **Skill-Taxonomy Matching (50% weight)**:
   - Evaluates a predefined taxonomy of 60+ technical skills (languages, frameworks, cloud tools, databases).
   - Computes overlap between mandatory required skills in the job requisition and extracted skills in the resume:
     $$\text{Skill Score} = \left(\frac{|\text{Matched Skills}|}{|\text{Required Skills}|}\right) \times 100$$
5. **Base Parse Quality & Synthesis (20% weight)**:
   - Awards a baseline score (15 points) for clean, parsable document structures (>300 chars).
   - Combines weights to generate a final deterministic score between $0.0$ and $100.0$:
     $$\text{Final ATS Score} = (0.30 \times \text{Sim}) + (0.50 \times \text{Skill}) + \text{Base Parse Score}$$

> **Why this design is superior in interviews**: Pure keyword matching suffers from keyword stuffing, while pure vector similarity can miss hard mandatory requirements (e.g., candidate has great general writing but lacks "PostgreSQL"). Our hybrid model gives hiring managers both semantic context and strict requirement verification.

---

### Deep Dive 2: Authentication & Security Architecture
- **Password Security**: Uses `passlib[bcrypt]` with salted password hashing. Passwords are never stored in plaintext.
- **Stateless Tokens**: Implements standard OAuth2 JWT Bearer tokens signed with HMAC-SHA256 (`HS256`).
- **Token Payload**: Contains `sub` (User ID), `role`, and `exp` timestamp (1440 minutes / 24 hours).
- **FastAPI Dependency Injection**:
  Routes are protected at the decorator level using `require_role(["resource_manager", "super_admin"])`.
- **Frontend Route Guards**: React Router's `<ProtectedRoute allowedRole="..." />` checks token validity and role matching. If an unauthorized user accesses another role's dashboard, they are immediately redirected.

---

### Deep Dive 3: Dual-Mode Storage Architecture (`minio_client.py`)
- **Production Mode**: Uses `boto3` connected to MinIO / AWS S3 buckets. Generates **S3 Presigned POST URLs** allowing clients to upload directly to object storage, reducing backend memory overhead.
- **Zero-Failure Local Fallback**: If MinIO is unreachable or disabled during local development/offline deployment, the client catches the connection timeout and automatically redirects reads/writes to local disk storage (`uploads/resumes/`). The application never crashes due to missing cloud buckets.

---

### Deep Dive 4: Database Design & Schema Highlights
- **`users` Table**: Supports multi-tenancy attributes (`role`, `status`, `company_name`, `is_active`).
- **`applications` Table**: Central hub connecting candidate profiles to requisitions. Tracks candidate lifecycle via `ApplicationStatus` enum.
- **`application_status_history` Table**: Immutable audit trail recording every state change, timestamp, and user who performed the transition (crucial for enterprise compliance and hiring analytics).
- **Cascade Deletions**: Configured on foreign keys (`ondelete="CASCADE"`) to maintain referential integrity when test candidates or requisitions are purged.

---

## 6. Top 10 Technical Interview Questions & Answers

### Q1: "Walk me through the architecture of your project."
**Answer**:
*"Hirestream is built as a decoupled monorepo. On the frontend, we use React 19 with Vite, TypeScript, and TailwindCSS for a responsive, role-based single-page application. The backend is powered by FastAPI and SQLAlchemy ORM on top of PostgreSQL. We use JWT for stateless authentication and enforce route-level RBAC. For file storage, we implemented an S3-compatible MinIO client with a dynamic fallback to local storage. On the AI/ATS side, we use a hybrid TF-IDF and skill-taxonomy scoring engine to parse and evaluate resumes against job requisitions."*

### Q2: "Why did you choose FastAPI over Django or Flask?"
**Answer**:
*"Three main reasons: First, **performance and concurrency**—FastAPI is built on Starlette and ASGI, giving us high async throughput. Second, **data integrity**—native integration with Pydantic v2 ensures strict request/response data validation and auto-generates Swagger OpenAPI documentation. Third, **dependency injection**—FastAPI's dependency injection system made it clean to implement our database session lifecycle (`get_db`) and role-based route guards (`require_role`)."*

### Q3: "How does your ATS resume parser work?"
**Answer**:
*"When a candidate uploads a PDF resume, `pdfplumber` extracts the raw text. The text is passed to our `ats_service`, which cleans and normalizes it. We calculate a TF-IDF cosine similarity against the job description using Scikit-Learn to capture semantic overlap. In parallel, we run a keyword extraction against our technical skill taxonomy. We combine both: 30% weight to TF-IDF similarity, 50% weight to exact mandatory skill matching, and 20% base structural score. This produces an ATS score between 0 and 100 alongside lists of matched and missing skills."*

### Q4: "How did you implement Role-Based Access Control (RBAC)?"
**Answer**:
*"We implemented RBAC on both layers. In the backend, user roles (`super_admin`, `resource_manager`, `hiring_manager`, `candidate`) are stored in an Enum in the database and embedded in the JWT claims upon login. We use a custom FastAPI dependency `require_role(allowed_roles)` to validate the token and restrict endpoint execution. On the frontend, React Router wraps sensitive route trees with a `<ProtectedRoute allowedRole="..." />` component that checks the decoded token in `AuthContext` and redirects unauthorized access."*

### Q5: "What was the most challenging bug or technical challenge you faced?"
**Answer**:
*"One notable challenge was handling environment portability across storage and Python dependencies. In production, we rely on S3/MinIO for presigned file uploads, but during development or in offline environments, external storage can fail. I designed a resilient fallback in `minio_client.py` that catches S3 connection timeouts, switches the storage pointer to local disk, and routes downloads through a mounted static `/uploads` path without throwing 500 errors to the client. Another challenge was fine-tuning the ATS score so that short resumes without keyword stuffing weren't unfairly penalized—we solved this by weighting specific required skills higher than raw text length."*

### Q6: "How do you handle database migrations?"
**Answer**:
*"We use Alembic alongside SQLAlchemy. Data models are defined declaratively in `app/models/`. Alembic tracks revisions in `alembic/versions/`. When deploying or updating tables (such as our recent document verification columns), we run `alembic upgrade head`, ensuring backward compatibility and database schema reproducibility."*

### Q7: "How is Google Calendar integrated into the interview workflow?"
**Answer**:
*"We use Google's OAuth2 credentials and the Google API client (`google-api-python-client`). When a Hiring Manager schedules an interview in the UI, the backend creates a calendar event using the Google Calendar API, populates the candidate's email as an attendee, auto-generates a Google Meet video conference link, and updates the `interviews` table with the meeting link and scheduled time."*

### Q8: "How does the onboarding and recruiter approval workflow function?"
**Answer**:
*"To prevent unauthorized users from viewing confidential hiring data, newly registered Hiring Managers and Resource Managers are initially assigned a `pending` status. They cannot log in until a Super Admin approves their request in the Super Admin Dashboard. Once approved, their status changes to `approved`, granting access to their respective recruitment pipelines."*

### Q9: "How do you handle CORS and security headers?"
**Answer**:
*"We configure FastAPI's `CORSMiddleware` using configurable environment variables (`ALLOWED_ORIGINS`). For reverse proxies (like Nginx in Docker or Vercel/Render edge routers), we register `ProxyHeadersMiddleware` at the top of the middleware stack so that client IPs, forwarded protocols (`https`), and host headers are accurately preserved."*

### Q10: "If you had 3 more months to work on this, what would you add or improve?"
**Answer**:
*"I would focus on three areas:
1. **LLM-Powered Semantic Parsing**: Augment our Scikit-Learn TF-IDF engine with an LLM (such as Gemini 2.5 Flash) via embeddings to evaluate qualitative candidate achievements, project complexity, and contextual seniority.
2. **Asynchronous Task Queue**: Offload email dispatch and heavy PDF OCR extraction to Celery or ARQ with a Redis broker so API response times remain under 50ms.
3. **WebSockets for Real-Time Updates**: Introduce WebSocket notifications so Hiring Managers and Resource Managers see real-time pipeline status transitions without polling."*

---

## 7. Demo Seed Login Accounts

| Role | Email | Password | Primary Dashboard |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `dm4516718@gmail.com` | `12345678` | `/super-admin/dashboard` |
| **Resource Manager** | `rm1@company.com` | `12345678` | `/resource/dashboard` |
| **Hiring Manager 1** | `akshay@alphanome.ai` | `12345678` | `/hiring/dashboard` |
| **Hiring Manager 2** | `hm2@company.com` | `12345678` | `/hiring/dashboard` |
| **Candidates** | `alice@email.com` *(or bob, carol, etc.)* | `password123` | `/candidate` |

