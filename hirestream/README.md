# HireStream - Enterprise Applicant Tracking System (ATS)

HireStream is a professional-grade hiring platform built with FastAPI, React, PostgreSQL, and MinIO.

## 🚀 Production Deployment (Docker)

To deploy the entire platform in a production-ready environment:

1.  **Configure Environment**:
    - Copy `.env.example` to `.env` in the root and fill in your secrets.
    - Ensure `ALLOWED_ORIGINS` is set to your production domain.
    - Ensure `SECRET_KEY` is a long, random string.

2.  **Launch with Docker Compose**:
    ```bash
    docker-compose up --build -d
    ```
    This launches:
    - **Frontend**: Nginx serving the React build on port 80.
    - **Backend**: Gunicorn (4 workers) on port 8000.
    - **Database**: PostgreSQL on port 5432.
    - **Storage**: MinIO for resume and document storage (Port 9000).

3.  **Database Initial Setup**:
    - The first time you launch, you may need to apply database migrations:
      ```bash
      docker-compose exec backend alembic upgrade head
      ```

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Vite, TailwindCSS.
- **Backend**: FastAPI (Python 3.11), SQLAlchemy, Alembic.
- **Storage**: MinIO (S3 Compatible).
- **Database**: PostgreSQL.

## 🧪 Development Setup

### Backend (Python)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

## 🔒 Security
- Secrets are managed via `.env` files (ignored by Git).
- Production-grade WSGI (Gunicorn) used in containers.
- CORS restricted via configurable environment variables.
- Multi-stage Docker builds to minimize image size and surface area.
