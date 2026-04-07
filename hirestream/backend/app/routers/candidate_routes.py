from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os, uuid, shutil
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.candidate import Candidate
from app.models.requisition import Requisition
from app.models.application import Application, ApplicationStatus, CandidateStatus
from app.models.assessment import Assessment, AssessmentStatus
from app.schemas.assessment import AssessmentSchema, AssessmentSubmission
from app.schemas.application import ApplicationResponse
from app.routers.auth import get_current_user, require_role
from app.core.config import settings

router = APIRouter(prefix="/candidates", tags=["Candidate Dashboard"])
from app.schemas.candidate import CandidateUpdate, CandidateWithUser, CandidateResponse

@router.patch("/profile")
def update_profile(
    update: CandidateUpdate,
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    """Step 2: Update candidate reusable profile data."""
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    update_data = update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(candidate, key, value)
    
    db.commit()
    db.refresh(candidate)
    return candidate

@router.post("/resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"resumes/{uuid.uuid4()}{file_ext}"
    file_path = os.path.join("uploads", file_name)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    candidate.resume_path = file_name
    db.commit()
    db.refresh(candidate)
    return {"message": "Resume Uploaded Successfully", "resume_path": file_name}

@router.get("/profile", response_model=CandidateWithUser)
def get_profile(
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    res = CandidateWithUser.from_orm(candidate)
    res.full_name = current_user.full_name
    res.email = current_user.email
    return res

# 1. GET /jobs - Return all open requisitions
@router.get("/jobs")
def list_jobs(current_user: Optional[User] = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only show jobs that are active and have been approved (status='open')
    from app.models.requisition import RequisitionStatus
    from app.models.candidate import Candidate
    from app.models.application import Application
    
    jobs = db.query(Requisition).filter(
        Requisition.is_active == True,
        Requisition.status == RequisitionStatus.open
    ).all()
    
    applied_ids = []
    if current_user and current_user.role == UserRole.candidate:
        candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
        if candidate:
            applied_ids = [a.requisition_id for a in db.query(Application).filter(Application.candidate_id == candidate.id).all()]
            
    return [{
        "id": j.id,
        "title": j.title,
        "department": j.department,
        "location": j.location,
        "required_skills": j.required_skills,
        "is_applied": j.id in applied_ids,
        "job_description": j.job_description
    } for j in jobs]

# 2. GET /jobs/{id} - Return full job detail
@router.get("/jobs/{id}")
def get_job_detail(id: int, db: Session = Depends(get_db)):
    job = db.query(Requisition).filter(Requisition.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

from fastapi import BackgroundTasks
from app.services.ats_service import calculate_ats_score, extract_text_from_resume
from app.services.minio_client import get_object_content
from app.database import SessionLocal

def run_ats_bg(app_id: int):
    # Create an independent DB session for the background task
    db = SessionLocal()
    try:
        app = db.query(Application).filter(Application.id == app_id).first()
        if not app or not app.resume_path:
            return
            
        req = db.query(Requisition).filter(Requisition.id == app.requisition_id).first()
        if not req:
            return
            
        # Fetch content and compute score
        resume_bytes = get_object_content(app.resume_path)
        text = extract_text_from_resume(resume_bytes)
        jd_text = req.job_description or f"{req.title} {req.role} {req.required_skills or ''}"
        result = calculate_ats_score(text, jd_text, req.required_skills)
        
        # Save score and resume text for dynamic processing
        app.ats_score = result["score"]
        app.resume_text = text
        db.commit()
    except Exception as e:
        print(f"Background ATS Error for app {app_id}: {e}")
    finally:
        db.close()

# 3. POST /applications - Multi-step application submission
@router.post("/applications")
async def apply_to_job(
    background_tasks: BackgroundTasks,
    requisition_id: int = Form(...),
    resume_path: str = Form(...),
    # Personal Info
    dob: Optional[str] = Form(None),
    country: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    # Education
    school: Optional[str] = Form(None),
    degree: Optional[str] = Form(None),
    degree_of_study: Optional[str] = Form(None),
    area_of_study: Optional[str] = Form(None),
    education_country: Optional[str] = Form(None),
    # Experience
    current_ctc: Optional[float] = Form(None),
    expected_ctc: Optional[float] = Form(None),
    willing_to_relocate: bool = Form(False),
    available_start_date: Optional[str] = Form(None),
    work_mode_preference: Optional[str] = Form(None),
    relevant_experience: Optional[float] = Form(None),
    current_role_title: Optional[str] = Form(None),
    domain_experience: Optional[str] = Form(None),
    employment_type: Optional[str] = Form(None),
    screening_answers: Optional[str] = Form(None),
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    # Check if already applied
    existing = db.query(Application).filter(
        Application.candidate_id == candidate.id,
        Application.requisition_id == requisition_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this job")

    # Check Age (Must be 18+)
    if dob:
        try:
            birth_date = datetime.strptime(dob, "%Y-%m-%d")
            today = datetime.utcnow()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            if age < 18:
                raise HTTPException(status_code=400, detail="Candidates must be at least 18 years old to apply.")
        except ValueError:
            # If date format is invalid, we can either ignore or raise error. 
            # Given it's from a form, we expect YYYY-MM-DD.
            pass

    # Create application record
    try:
        # If candidate didn't specify employment type, inherit from the requisition
        req_for_type = db.query(Requisition).filter(Requisition.id == requisition_id).first()
        resolved_employment_type = employment_type
        if not resolved_employment_type and req_for_type and req_for_type.employment_type:
            resolved_employment_type = req_for_type.employment_type
        
        new_app = Application(
            candidate_id=candidate.id,
            requisition_id=requisition_id,
            resume_path=resume_path,
            status=ApplicationStatus.sourcing,
            candidate_status=CandidateStatus.applied,
            applied_at=datetime.utcnow(),
            # New Role-Specific Fields
            dob=dob,
            country=country,
            state=state,
            city=city,
            school=school,
            degree=degree,
            degree_of_study=degree_of_study,
            area_of_study=area_of_study,
            education_country=education_country,
            current_ctc=current_ctc,
            expected_ctc=expected_ctc,
            willing_to_relocate=willing_to_relocate,
            available_start_date=available_start_date,
            work_mode_preference=work_mode_preference,
            relevant_experience=relevant_experience,
            current_role_title=current_role_title,
            domain_experience=domain_experience,
            employment_type=resolved_employment_type,
            screening_answers=screening_answers
        )
        db.add(new_app)
        db.commit()
        db.refresh(new_app)
        
        # Trigger background ATS scan
        background_tasks.add_task(run_ats_bg, new_app.id)
        
        # Notify RMs
        from app.services.notification_service import notify_all_resource_managers
        req = db.query(Requisition).filter(Requisition.id == requisition_id).first()
        notify_all_resource_managers(
            db,
            title="New Candidate Application",
            message=f"{current_user.full_name} applied for {req.title if req else 'a role'}.",
            type="application",
            link="/rm/candidates"
        )
        
        return {"message": "Application submitted", "application_id": new_app.id}
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"FAILED TO CREATE APPLICATION: {e}")
        raise HTTPException(status_code=500, detail=f"Database error during application submission: {str(e)}")

# 4. GET /applications/me - Return applications for logged-in candidate
@router.get("/applications/me")
def get_my_applications(
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        return []
    
    apps = db.query(Application).filter(Application.candidate_id == candidate.id).all()
    results = []
    for app in apps:
        req = db.query(Requisition).filter(Requisition.id == app.requisition_id).first()
        results.append({
            "id": app.id,
            "requisition_id": app.requisition_id,
            "job_title": req.title if req else "N/A",
            "department": req.department if req else "N/A",
            "status": app.status,
            "ats_score": app.ats_score,
            "applied_at": app.applied_at,
            "updated_at": app.updated_at
        })
    return results

# 5. GET /analytics/candidate
@router.get("/analytics/candidate")
def get_candidate_analytics(
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        return {"total": 0, "screening": 0, "interview": 0, "rejected": 0, "offers": 0, "recent_applications": []}
    
    apps = db.query(Application).filter(Application.candidate_id == candidate.id).all()
    
    recent_apps = db.query(Application)\
        .filter(Application.candidate_id == candidate.id)\
        .order_by(Application.applied_at.desc())\
        .limit(5).all()
    
    recent_list = []
    for app in recent_apps:
        req = app.requisition
        from app.services.time_utils import format_utc_iso
        recent_list.append({
            "id": app.id,
            "requisition_id": app.requisition_id,
            "job_title": req.title if req else "N/A",
            "department": req.department if req else "General",
            "applied_at": format_utc_iso(app.applied_at),
            "status": app.status
        })

    return {
        "total": len(apps),
        "screening": sum(1 for a in apps if a.status in [ApplicationStatus.screening, ApplicationStatus.internal_shortlist, ApplicationStatus.assessment]),
        "interview": sum(1 for a in apps if a.status == ApplicationStatus.interviewing),
        "rejected": sum(1 for a in apps if a.status == ApplicationStatus.rejected),
        "offers": sum(1 for a in apps if a.status == ApplicationStatus.offer_extended),
        "recent_applications": recent_list
    }

@router.get("/assessments", response_model=List[AssessmentSchema])
def get_my_assessments(
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        return []
    
    # Get all assessments related to candidate's applications
    assessments = db.query(Assessment).join(Application).filter(Application.candidate_id == candidate.id).all()
    return assessments

@router.post("/assessments/{assessment_id}/submit", response_model=AssessmentSchema)
def submit_assessment(
    assessment_id: int,
    submission: AssessmentSubmission,
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Check if assessment belongs to current user
    app = db.query(Application).filter(Application.id == assessment.application_id).first()
    candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first()
    if not candidate or candidate.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to submit this assessment")
    
    assessment.submission_file_path = submission.submission_file_path
    assessment.submission_link = submission.submission_link
    assessment.status = AssessmentStatus.submitted
    assessment.submitted_at = datetime.utcnow()
    
    db.commit()
    db.refresh(assessment)

    # Notify all Resource Managers
    from app.services.notification_service import notify_all_resource_managers
    notify_all_resource_managers(
        db,
        title="Assessment Submitted",
        message=f"{current_user.full_name} has submitted the assessment: {assessment.title}",
        type="assessment",
        link=f"/rm/candidates/{app.id}"
    )

    return assessment

@router.get("/onboarding", response_model=Optional[ApplicationResponse])
def get_onboarding_details(
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        return None
    
    # Find the application that is in onboarding status
    from app.models.application import ApplicationStatus
    app = db.query(Application).filter(
        Application.candidate_id == candidate.id,
        Application.onboarding_status != "NONE"
    ).first()
    
    if not app:
        return None
    
    from app.routers.rm import build_rm_application_response
    return build_rm_application_response(app, db)

@router.post("/onboarding/accept")
async def accept_offer(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Find active onboarding application
    app = db.query(Application).filter(
        Application.candidate_id == candidate.id,
        Application.onboarding_status == "ONBOARDING_PENDING"
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Active onboarding application not found")

    from app.services.minio_client import upload_file_to_minio
    file_path = f"acceptances/{uuid.uuid4()}_{file.filename}"
    upload_file_to_minio(file.file, "acceptance-letters", file_path)
    
    app.acceptance_letter_path = file_path
    app.offer_letter_accepted = True
    db.commit()

    # Notify RMs
    from app.services.notification_service import notify_all_resource_managers
    notify_all_resource_managers(
        db,
        title="Offer Accepted",
        message=f"{current_user.full_name} has accepted the offer and uploaded the signed copy.",
        type="onboarding",
        link="/rm/dashboard?tab=administration"
    )

    return {"message": "Offer accepted and signed document uploaded"}

@router.post("/onboarding/documents")
async def upload_onboarding_documents(
    is_fresher: bool = Form(...),
    photo: Optional[UploadFile] = File(None),
    pan: Optional[UploadFile] = File(None),
    aadhaar: Optional[UploadFile] = File(None),
    academic: Optional[UploadFile] = File(None),
    address: Optional[UploadFile] = File(None),
    experience: Optional[UploadFile] = File(None),
    relieving: Optional[UploadFile] = File(None),
    payslips: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Find active application
    app = db.query(Application).filter(
        Application.candidate_id == candidate.id,
        Application.onboarding_status == "ONBOARDING_PENDING"
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Active onboarding application not found")
        
    from app.services.minio_client import upload_file_to_minio
    
    app.is_fresher = is_fresher
    
    uploads = [
        (photo, "photo_path", "candidate-documents"),
        (pan, "pan_path", "candidate-documents"),
        (aadhaar, "aadhaar_path", "candidate-documents"),
        (academic, "education_docs_path", "candidate-documents"),
        (address, "address_proof_path", "candidate-documents"),
        (experience, "experience_docs_path", "experience-documents"),
        (relieving, "relieving_letter_path", "experience-documents"),
        (payslips, "payslips_path", "experience-documents")
    ]
    
    for file, field_name, bucket in uploads:
        if file:
            file_path = f"{field_name}/{uuid.uuid4()}_{file.filename}"
            upload_file_to_minio(file.file, bucket, file_path)
            setattr(app, field_name, file_path)

    app.documents_submitted = True
    db.commit()

    # Notify RMs
    from app.services.notification_service import notify_all_resource_managers
    notify_all_resource_managers(
        db,
        title="Documents Submitted",
        message=f"{current_user.full_name} has uploaded {'fresher' if is_fresher else 'experienced'} onboarding documents.",
        type="onboarding",
        link="/rm/dashboard?tab=administration"
    )

    return {"message": "Documents submitted successfully"}

@router.get("/onboarding/offer-letter/{app_id}")
def get_offer_letter_url(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # This endpoint can be used by both Candidate or RM
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app or not app.candidate:
        raise HTTPException(status_code=404, detail="Application or candidate not found")
        
    candidate = app.candidate
    if not app.offer_letter_path:
        raise HTTPException(status_code=404, detail="Offer letter not found")
        
    # Authorization: Either the candidate themselves or an RM
    if current_user.role == UserRole.candidate and candidate.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role not in [UserRole.resource_manager, UserRole.candidate]:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.services.minio_client import get_presigned_download_url
    url = get_presigned_download_url(app.offer_letter_path, bucket_name="offer-letters")
    return {"download_url": url}
