from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
import os, shutil, uuid
from app.database import get_db
from app.models.user import User, UserRole
from app.models.candidate import Candidate
from app.models.requisition import Requisition
from app.models.application import Application, ApplicationStatus, CandidateStatus
from app.schemas.application import ApplicationCreate, ApplicationStatusUpdate, ApplicationResponse
from app.routers.auth import get_current_user, require_role
from app.core.config import settings

router = APIRouter(prefix="/applications", tags=["Applications"])

def build_application_response(app: Application, db: Session) -> ApplicationResponse:
    candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first()
    user = candidate.user if candidate else None
    req = db.query(Requisition).filter(Requisition.id == app.requisition_id).first()
    
    #the above queries is to get the candidate and requisition details 
    # Get status history
    from app.models.status_history import ApplicationStatusHistory
    history = db.query(ApplicationStatusHistory).filter(ApplicationStatusHistory.application_id == app.id).order_by(ApplicationStatusHistory.changed_at.desc()).all()
    #this is to get the status history of the application
    return ApplicationResponse(
        id=app.id,
        candidate_id=app.candidate_id,
        requisition_id=app.requisition_id,
        status=app.status,
        resume_path=app.resume_path,
        ats_score=app.ats_score,
        cover_letter=app.cover_letter,
        notes=app.notes,
        applied_at=app.applied_at,
        updated_at=app.updated_at,
        candidate_name=user.full_name if user else None,
        candidate_email=user.email if user else None,
        candidate_skills=candidate.skills if candidate else None,
        candidate_experience=candidate.experience_years if candidate else None,
        candidate_current_title=candidate.current_title if candidate else None,
        candidate_summary=candidate.summary if candidate else None,
        requisition_title=req.title if req else None,
        requisition_role=req.role if req else None,
        requisition_location=req.location if req else None,
        status_history=history
    )

@router.post("", response_model=ApplicationResponse)
async def apply_to_job(
    requisition_id: int = Form(...),
    cover_letter: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
    # Stage 1 & 2 fields
    dob: Optional[str] = Form(None),
    country: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    # Education
    school: Optional[str] = Form(None),
    degree: Optional[str] = Form(None),
    degree_of_study: Optional[str] = Form(None),
    area_of_study: Optional[str] = Form(None),
    education_country: Optional[str] = Form(None),
    # Work Experience
    is_first_job: bool = Form(False),
    current_ctc: Optional[float] = Form(None),
    expected_ctc: Optional[float] = Form(None),
    work_mode_preference: Optional[str] = Form(None),
    relevant_experience: Optional[float] = Form(None),
    current_role_title: Optional[str] = Form(None),
    
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db) #this is to get the database session
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    req = db.query(Requisition).filter(Requisition.id == requisition_id).first()
    if not req or not req.is_active:
        raise HTTPException(status_code=404, detail="Job not found or closed")

    print(f"DEBUG: Applying candidate {candidate.id} to requisition {requisition_id}")
    existing = db.query(Application).filter(
        Application.candidate_id == candidate.id,
        Application.requisition_id == requisition_id
    ).first()
    if existing:
        print(f"DEBUG: Already applied. App ID: {existing.id}")
        raise HTTPException(status_code=400, detail="Already applied to this job")

    resume_path = candidate.resume_path
    resume_text = None
    if resume:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True) #this is to create the directory if it does not exist
        filename = f"{uuid.uuid4()}_{resume.filename}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(resume.file, f)
        resume_path = filepath
        # Extract text from PDF
        try:
            import pdfplumber
            with pdfplumber.open(filepath) as pdf: #pdfplumber is a library used to extract text from pdf
                resume_text = "\n".join(page.extract_text() or "" for page in pdf.pages) #here we are extracting the text from the pdf
        except Exception:
            resume_text = ""
        if candidate.resume_path is None:
            candidate.resume_path = resume_path
            db.commit()
    elif not resume_path:
        raise HTTPException(status_code=400, detail="Resume is required")


    app = Application(
        candidate_id=candidate.id,
        requisition_id=requisition_id,
        cover_letter=cover_letter,
        resume_path=resume_path,
        resume_text=resume_text,
        status=ApplicationStatus.sourcing,
        candidate_status=CandidateStatus.applied,
        # New fields
        dob=dob,
        country=country,
        city=city,
        
        state=state,
        school=school,
        degree=degree,
        degree_of_study=degree_of_study,
        area_of_study=area_of_study,
        education_country=education_country,
        is_first_job=is_first_job,
        current_ctc=current_ctc,
        expected_ctc=expected_ctc,
        work_mode_preference=work_mode_preference,
        relevant_experience=relevant_experience,
        current_role_title=current_role_title
    )
    db.add(app)
    
    # Update global candidate status (New Product Flow Requirement)
    candidate.application_status = "Applied"
    
    db.commit()
    db.refresh(app)
    return build_application_response(app, db)

@router.get("", response_model=List[ApplicationResponse])
def list_applications(
    current_user: User = Depends(get_current_user), #this is to get the current user
    db: Session = Depends(get_db), #this is to get the database session
    requisition_id: Optional[int] = None, #this is to get the requisition id
    status: Optional[str] = None #this is to get the status
): #above are the parameters for the list_applications function that are used to filter the applications
    if current_user.role == UserRole.candidate:
        candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
        if not candidate:
            return []
        q = db.query(Application).filter(Application.candidate_id == candidate.id)
    elif current_user.role in [UserRole.hiring_manager, UserRole.resource_manager]:
        q = db.query(Application)
        if requisition_id:
            q = q.filter(Application.requisition_id == requisition_id)
    else:
        return []

    if status:
        q = q.filter(Application.status == status)

    apps = q.order_by(Application.applied_at.desc()).all()
    return [build_application_response(a, db) for a in apps]

@router.patch("/{app_id}/status", response_model=ApplicationResponse)
def update_application_status(
    app_id: int,
    update: ApplicationStatusUpdate,
    current_user: User = Depends(require_role(UserRole.hiring_manager, UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.status = update.status
    if update.notes:
        app.notes = update.notes
    db.commit()
    db.refresh(app)
    return build_application_response(app, db)

@router.get("/analytics/candidate")
def candidate_analytics(current_user: User = Depends(require_role(UserRole.candidate)), db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        return {"total": 0, "screening": 0, "interview": 0, "rejected": 0, "offers": 0, "recent_applications": []}
    
    # Optimized query to get all applications for count
    apps = db.query(Application).filter(Application.candidate_id == candidate.id).all()
    
    # Fetch recent 5 applications using the relationship
    recent_apps = db.query(Application)\
        .filter(Application.candidate_id == candidate.id)\
        .order_by(Application.applied_at.desc())\
        .limit(5).all()
    
    recent_list = []
    for app in recent_apps:
        req = app.requisition
        recent_list.append({
            "id": app.id,
            "requisition_id": app.requisition_id,
            "job_title": req.title if req else "N/A",
            "department": req.department if req else "General",
            "applied_at": app.applied_at.isoformat(),
            "status": app.status
        })

    return {
        "total": len(apps),
        "screening": sum(1 for a in apps if a.status in [ApplicationStatus.sourcing, ApplicationStatus.screening, ApplicationStatus.internal_shortlist, ApplicationStatus.assessment]),
        "interview": sum(1 for a in apps if a.status == ApplicationStatus.interviewing),
        "rejected": sum(1 for a in apps if a.status == ApplicationStatus.rejected),
        "offers": sum(1 for a in apps if a.status == ApplicationStatus.offer_extended),
        "recent_applications": recent_list
    }

@router.get("/analytics/hm")
def hm_analytics(current_user: User = Depends(require_role(UserRole.hiring_manager)), db: Session = Depends(get_db)):
    from app.models.interview import Interview
    reqs = db.query(Requisition).filter(
        Requisition.assigned_hm_id == current_user.id,
        Requisition.is_active == True
    ).all()
    req_ids = [r.id for r in reqs]
    apps = db.query(Application).filter(Application.requisition_id.in_(req_ids)).all() if req_ids else []
    interviews = db.query(Interview).filter(Interview.scheduled_by == current_user.id).all()
    return {
        "active_roles": len(reqs),
        "candidates_in_interview": sum(1 for a in apps if a.status == ApplicationStatus.interviewing),
        "scheduled_interviews": len([i for i in interviews if i.status.value == "scheduled"]),
        "offers_extended": sum(1 for a in apps if a.status == ApplicationStatus.offer_extended),
    }

@router.get("/analytics/rm")
def rm_analytics(current_user: User = Depends(require_role(UserRole.resource_manager)), db: Session = Depends(get_db)):
    reqs = db.query(Requisition).filter(Requisition.is_active == True).all()
    all_apps = db.query(Application).all()
    return {
        "active_requisitions": len(reqs),
        "candidates_in_pipeline": len(all_apps),
        "ready_for_hm": sum(1 for a in all_apps if a.status == ApplicationStatus.ready_for_hm),
        "avg_time_to_fill": 14,  # placeholder
    }
