from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.application import Application, ApplicationStatus
from app.models.requisition import Requisition
from app.schemas.application import ATSAnalyzeRequest
from app.services.ats_service import calculate_ats_score, extract_text_from_resume
from app.routers.auth import require_role

router = APIRouter(prefix="/ats", tags=["ATS"])

@router.post("/analyze")
def analyze_resume(
    data: ATSAnalyzeRequest,
    current_user: User = Depends(require_role(UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == data.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    req = db.query(Requisition).filter(Requisition.id == app.requisition_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    # Get resume text
    resume_text = app.resume_text or ""
    if not resume_text and app.resume_path:
        from app.services.minio_client import get_object_content
        resume_bytes = get_object_content(app.resume_path)
        resume_text = extract_text_from_resume(resume_bytes)
        if resume_text:
            app.resume_text = resume_text
            db.commit()

    if not resume_text:
        # Use candidate's skills as fallback
        from app.models.candidate import Candidate
        candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first()
        resume_text = candidate.skills or "" if candidate else ""
        if candidate and candidate.summary:
            resume_text += " " + candidate.summary

    jd_text = req.job_description or ""
    if not jd_text:
        jd_text = f"{req.title} {req.role} {req.required_skills or ''}"

    result = calculate_ats_score(resume_text, jd_text, req.required_skills)

    # Save ATS score to application
    app.ats_score = result["score"]
    db.commit()

    return {
        "application_id": data.application_id,
        "ats_score": result["score"],
        "similarity_score": result["similarity"],
        "matched_skills": result["matched_skills"],
        "missing_skills": result["missing_skills"],
        "all_resume_skills": result["all_resume_skills"],
        "recommendation": "Proceed" if result["score"] >= 50 else "Review Required",
    }
#the entire file tells about the ats score calculation 
#how this directly runs in the backned is that when the candidate uploads the resume it gets stored in the minio and the ats score is calculated and stored in the database