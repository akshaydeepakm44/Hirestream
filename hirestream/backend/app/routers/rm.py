from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
import os, shutil, uuid
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User, UserRole
from app.models.candidate import Candidate
from app.models.requisition import Requisition
from app.models.application import Application, ApplicationStatus
from app.models.assessment import Assessment, AssessmentStatus
from app.models.status_history import ApplicationStatusHistory
from app.schemas.application import ApplicationResponse, ApplicationStatusUpdate, ATSAnalyzeRequest
from app.schemas.assessment import AssessmentCreate, AssessmentSchema
from app.schemas.requisition import RequisitionCreate, RequisitionResponse, RequisitionUpdate
from app.schemas.candidate import CandidateResponse, CandidateWithUser
from app.routers.auth import require_role
from app.services.minio_client import get_presigned_download_url, get_object_content
from app.services.ats_service import calculate_ats_score, extract_text_from_resume, extract_skills_from_text
from app.services.google_service import send_gmail
from app.services.notification_service import notify_user
from app.core.config import settings

router = APIRouter(prefix="/rm", tags=["Resource Manager Dashboard"])

def build_rm_application_response(app: Application, db: Session) -> ApplicationResponse:
    candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first()
    user = candidate.user if candidate else None
    req = db.query(Requisition).filter(Requisition.id == app.requisition_id).first()
    
    # Get status history
    history = db.query(ApplicationStatusHistory).filter(ApplicationStatusHistory.application_id == app.id).order_by(ApplicationStatusHistory.changed_at.desc()).all()
    
    resume_url = None
    if app.resume_path:
        try:
            resume_url = get_presigned_download_url(app.resume_path)
        except Exception:
            pass

    # --- Dynamic Bio & Skills Generation ---
    candidate_summary = candidate.summary if candidate else None
    if not candidate_summary or candidate_summary.strip() == "":
        role = app.current_role_title or (candidate.current_title if candidate else None)
        exp = app.relevant_experience or (candidate.experience_years if candidate else 0)
        domain = app.domain_experience or "software development"
        edu = f"{app.degree} in {app.area_of_study}" if app.degree and app.area_of_study else (app.degree or "")
        college = f"from {app.school}" if app.school else ""
        
        if role and exp:
            candidate_summary = f"{role} with {exp} years of specialized experience in {domain}."
            if edu:
                candidate_summary += f" Graduate {edu} {college}."
        elif edu:
            candidate_summary = f"Graduate with {edu} {college}. Focused on building a career in {domain}."
        else:
            candidate_summary = f"Professional candidate focusing on {domain}. Applied for {req.title if req else 'this role'}."

    candidate_skills = candidate.skills if candidate else None
    if not candidate_skills or candidate_skills.strip() == "":
        skills_found = []
        # Attempt 1: From resume_text if already scanned
        if app.resume_text:
            extracted = extract_skills_from_text(app.resume_text, (req.required_skills.split(",") if req and req.required_skills else None))
            if extracted:
                skills_found = extracted
        
        # Attempt 2: From application metadata if still empty
        if not skills_found:
            if app.current_role_title: skills_found.append(app.current_role_title)
            if app.domain_experience: skills_found.append(app.domain_experience)
            if app.area_of_study: skills_found.append(app.area_of_study)
            
        candidate_skills = ", ".join(skills_found) if skills_found else "Analytical skills, Communication, Technical proficiency"

    # Get interviews (Filter by Resource Manager role for strict isolation)
    from app.models.interview import Interview
    interviews = db.query(Interview).filter(
        Interview.application_id == app.id,
        Interview.scheduled_role == UserRole.resource_manager
    ).order_by(Interview.scheduled_at.desc()).all()
    from app.routers.interviews import build_interview_response
    interview_responses = [build_interview_response(i, db).dict() for i in interviews]

    return ApplicationResponse(
        id=app.id,
        candidate_id=app.candidate_id,
        requisition_id=app.requisition_id,
        status=app.status,
        resume_path=app.resume_path,
        resume_url=resume_url,
        ats_score=app.ats_score,
        cover_letter=app.cover_letter,
        notes=app.notes,
        rm_rating=app.rm_rating,
        rm_feedback=app.rm_feedback,
        applied_at=app.applied_at,
        updated_at=app.updated_at,
        
        dob=app.dob,
        country=app.country,
        city=app.city,
        state=app.state,
        
        school=app.school,
        degree=app.degree,
        degree_of_study=app.degree_of_study,
        area_of_study=app.area_of_study,
        education_country=app.education_country,
        
        is_first_job=app.is_first_job,
        current_ctc=app.current_ctc,
        expected_ctc=app.expected_ctc,
        willing_to_relocate=app.willing_to_relocate,
        available_start_date=app.available_start_date,
        work_mode_preference=app.work_mode_preference,
        relevant_experience=app.relevant_experience,
        current_role_title=app.current_role_title,
        domain_experience=app.domain_experience,
        employment_type=app.employment_type,
        screening_answers=app.screening_answers,
        
        candidate_name=user.full_name if user else None,
        candidate_email=user.email if user else None,
        candidate_phone=candidate.phone if candidate else None,
        candidate_skills=candidate_skills,
        candidate_experience=candidate.experience_years if candidate else None,
        candidate_current_title=candidate.current_title if candidate else None,
        candidate_summary=candidate_summary,
        requisition_title=req.title if req else None,
        requisition_role=req.role if req else None,
        requisition_location=req.location if req else None,
        status_history=history,
        interviews=interview_responses,
        assessments=[AssessmentSchema.from_orm(a) for a in app.assessments],
        candidate_status=app.candidate_status.value if hasattr(app.candidate_status, 'value') else str(app.candidate_status),
        
        # Onboarding fields
        onboarding_status=app.onboarding_status,
        is_fresher=app.is_fresher,
        offer_letter_sent=app.offer_letter_sent,
        offer_letter_accepted=app.offer_letter_accepted,
        documents_submitted=app.documents_submitted,
        onboarding_completed=app.onboarding_completed,
        
        offer_letter_path=app.offer_letter_path,
        acceptance_letter_path=app.acceptance_letter_path,
        
        aadhaar_path=app.aadhaar_path,
        pan_path=app.pan_path,
        address_proof_path=app.address_proof_path,
        education_docs_path=app.education_docs_path,
        photo_path=app.photo_path,
        experience_docs_path=app.experience_docs_path,
        relieving_letter_path=app.relieving_letter_path,
        payslips_path=app.payslips_path,
        
        # Verification states
        govt_id_verified=app.govt_id_verified,
        academic_verified=app.academic_verified,
        address_verified=app.address_verified,
        photo_verified=app.photo_verified,
        experience_verified=app.experience_verified,
        relieving_verified=app.relieving_verified,
        payslips_verified=app.payslips_verified,
        
        # URLs
        offer_letter_url=get_presigned_download_url(app.offer_letter_path, "offer-letters") if app.offer_letter_path else None,
        acceptance_letter_url=get_presigned_download_url(app.acceptance_letter_path, "acceptance-letters") if app.acceptance_letter_path else None,
        aadhaar_url=get_presigned_download_url(app.aadhaar_path, "candidate-documents") if app.aadhaar_path else None,
        pan_url=get_presigned_download_url(app.pan_path, "candidate-documents") if app.pan_path else None,
        address_proof_url=get_presigned_download_url(app.address_proof_path, "candidate-documents") if app.address_proof_path else None,
        education_docs_url=get_presigned_download_url(app.education_docs_path, "candidate-documents") if app.education_docs_path else None,
        photo_url=get_presigned_download_url(app.photo_path, "candidate-documents") if app.photo_path else None,
        experience_docs_url=get_presigned_download_url(app.experience_docs_path, "experience-documents") if app.experience_docs_path else None,
        relieving_letter_url=get_presigned_download_url(app.relieving_letter_path, "experience-documents") if app.relieving_letter_path else None,
        payslips_url=get_presigned_download_url(app.payslips_path, "experience-documents") if app.payslips_path else None
    )

@router.get("/requisitions", response_model=List[RequisitionResponse])
def get_requisitions(db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.resource_manager))):
    from app.models.requisition import RequisitionStatus
    reqs = db.query(Requisition).filter(
        Requisition.status.in_([RequisitionStatus.open, RequisitionStatus.closed])
    ).order_by(Requisition.created_at.desc()).all()
    # Simple applicant count
    from app.models.application import Application
    res = []
    for r in reqs:
        count = db.query(Application).filter(Application.requisition_id == r.id).count()
        resp = RequisitionResponse.from_orm(r)
        resp.applicant_count = count
        res.append(resp)
    return res

@router.get("/hire-requests", response_model=List[RequisitionResponse])
def get_pending_hire_requests(db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.resource_manager))):
    """Get all pending hire requests for RM approval."""
    from app.models.requisition import RequisitionStatus
    reqs = db.query(Requisition).filter(Requisition.status == 'pending').order_by(Requisition.created_at.desc()).all()
    # Simple applicant count
    from app.models.application import Application
    res = []
    for r in reqs:
        count = db.query(Application).filter(Application.requisition_id == r.id).count()
        resp = RequisitionResponse.from_orm(r)
        resp.applicant_count = count
        res.append(resp)
    return res

@router.patch("/hire-requests/{id}/approve")
def approve_hire_request(
    id: int, 
    update: RequisitionUpdate,
    current_user: User = Depends(require_role(UserRole.resource_manager)), 
    db: Session = Depends(get_db)
):
    from app.models.requisition import RequisitionStatus
    req = db.query(Requisition).filter(Requisition.id == id, Requisition.status == RequisitionStatus.pending).first()
    if not req:
        raise HTTPException(status_code=404, detail="Pending hire request not found")
    
    # Apply updates from RM before approving
    update_data = update.dict(exclude_unset=True)
    if 'status' in update_data:
        del update_data['status'] # Don't allow RM to set status directly here, we do it below
        
    for key, value in update_data.items():
        setattr(req, key, value)
        
    req.status = RequisitionStatus.open
    req.is_active = True
    req.company_name = current_user.company_name
    db.commit()
    db.refresh(req)
    
    # Notify HM
    from app.services.notification_service import notify_user
    notify_user(
        db,
        user_id=req.created_by,
        title="Hire Request Approved",
        message=f"Your request for {req.title} has been approved by {current_user.full_name}.",
        type="requisition",
        link="/hm/requisitions"
    )
    
    return {"message": "Hire request approved", "requisition": build_req_response_rm(req, db)}

@router.patch("/hire-requests/{id}/reject")
def reject_hire_request(
    id: int, 
    current_user: User = Depends(require_role(UserRole.resource_manager)), 
    db: Session = Depends(get_db)
):
    from app.models.requisition import RequisitionStatus
    req = db.query(Requisition).filter(Requisition.id == id, Requisition.status == RequisitionStatus.pending).first()
    if not req:
        raise HTTPException(status_code=404, detail="Pending hire request not found")
    
    req.status = RequisitionStatus.rejected
    req.is_active = False
    db.commit()
    
    # Notify HM
    from app.services.notification_service import notify_user
    notify_user(
        db,
        user_id=req.created_by,
        title="Hire Request Rejected",
        message=f"Your request for {req.title} was rejected.",
        type="requisition",
        link="/hm/requisitions"
    )
    
    return {"message": "Hire request rejected", "requisition": build_req_response_rm(req, db)}

def build_req_response_rm(req: Requisition, db: Session) -> RequisitionResponse:
    from app.models.application import Application
    count = db.query(Application).filter(Application.requisition_id == req.id).count()
    r = RequisitionResponse.from_orm(req)
    r.applicant_count = count
    return r


@router.patch("/requisitions/{id}/status")
def update_requisition_status(
    id: int, 
    status: str = Form(...) if False else None, # Let's use Body since front-end sends JSON
    # Wait, the frontend sends { status: newStatus }
    payload: dict = Body(...),
    current_user: User = Depends(require_role(UserRole.resource_manager)), 
    db: Session = Depends(get_db)
):
    req = db.query(Requisition).filter(Requisition.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    
    new_status = payload.get("status")
    from app.models.requisition import RequisitionStatus
    if new_status in [s.value for s in RequisitionStatus]:
        req.status = RequisitionStatus(new_status)
        req.is_active = (new_status == "open")
        db.commit()
        return req
    raise HTTPException(status_code=400, detail="Invalid status")

@router.post("/requisitions", response_model=RequisitionResponse)
def create_requisition(
    data: RequisitionCreate,
    current_user: User = Depends(require_role(UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    req = Requisition(
        title=data.title,
        role=data.role,
        department=data.department,
        location=data.location,
        required_skills=data.required_skills,
        job_description=data.job_description,
        created_by=current_user.id,
        assigned_hm_id=data.assigned_hm_id,
        company_name=current_user.company_name
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    count = db.query(Application).filter(Application.requisition_id == req.id).count()
    r = RequisitionResponse.from_orm(req)
    r.applicant_count = count
    return r

@router.get("/applications", response_model=List[ApplicationResponse])
def get_all_applications(
    requisition_id: Optional[int] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    from app.models.application import CandidateStatus
    # This endpoint is primarily used by the Pipeline view, so it should only show candidates in_pipeline
    q = db.query(Application).filter(Application.candidate_status == CandidateStatus.in_pipeline)
    if requisition_id:
        q = q.filter(Application.requisition_id == requisition_id)
    apps = q.all()
    return [build_rm_application_response(a, db) for a in apps]

@router.get("/applications/filter-metadata")
def get_filter_metadata(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    work_modes = db.query(Application.work_mode_preference).filter(Application.work_mode_preference.isnot(None)).distinct().all()
    # Collect employment types from both Application and Requisition tables
    app_emp_types = db.query(Application.employment_type).filter(Application.employment_type.isnot(None)).distinct().all()
    req_emp_types = db.query(Requisition.employment_type).filter(Requisition.employment_type.isnot(None)).distinct().all()
    # Merge and deduplicate (case-insensitive)
    all_types = set()
    for t in app_emp_types:
        if t[0]: all_types.add(t[0])
    for t in req_emp_types:
        if t[0]: all_types.add(t[0])
    employment_types_list = sorted(list(all_types)) if all_types else ["Fulltime", "Internship", "Contract", "Freelance"]
    
    return {
        "work_modes": [m[0] for m in work_modes] if work_modes else ["Remote", "Hybrid", "Onsite"],
        "employment_types": employment_types_list
    }

@router.get("/applications/paginated")
def get_paginated_applications(
    page: int = 1,
    limit: int = 10,
    requisition_id: Optional[int] = None,
    min_score: Optional[float] = None,
    search: Optional[str] = None,
    # Filter Parameters
    work_mode: Optional[str] = None,
    min_ctc: Optional[float] = None,
    max_ctc: Optional[float] = None,
    min_experience: Optional[float] = None,
    max_experience: Optional[float] = None,
    employment_type: Optional[str] = None,
    days_ago: Optional[int] = None,
    # Sorting
    sort_by: str = "applied_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    skip = (page - 1) * limit
    from app.models.application import CandidateStatus
    # The paginated list is primarily used by the "Candidates" (Resource Manager Applicants) page.
    # It should only show those who have applied but haven't been moved to the pipeline yet.
    q = db.query(Application).filter(Application.candidate_status == CandidateStatus.applied)
    
    # 1. Joins if needed for search
    if search:
        from app.models.candidate import Candidate
        from app.models.user import User
        search_filter = f"%{search}%"
        q = q.join(Application.candidate).join(Candidate.user).filter(
            (User.full_name.ilike(search_filter)) | 
            (User.email.ilike(search_filter))
        )
        
    # 2. Requisition Filter
    if requisition_id:
        q = q.filter(Application.requisition_id == requisition_id)
        
    # 3. Simple Filters
    if min_score and min_score > 0:
        q = q.filter(Application.ats_score >= min_score)
        
    if work_mode:
        from sqlalchemy import func
        q = q.filter(func.lower(Application.work_mode_preference) == func.lower(work_mode))
        
    if employment_type:
        from sqlalchemy import func, or_
        from app.models.requisition import Requisition as Req
        # Check Application.employment_type first; if NULL, fall back to Requisition.employment_type
        # This handles both new applications (have their own field) and old ones (inherit from job)
        q = q.join(Req, Application.requisition_id == Req.id, isouter=True).filter(
            or_(
                func.lower(Application.employment_type) == func.lower(employment_type),
                # Fallback: if app has no employment_type, use the requisition's type
                (Application.employment_type.is_(None)) & (func.lower(Req.employment_type) == func.lower(employment_type))
            )
        )
        
    # 4. Range Filters (Only apply if they have meaningful values to avoid filtering out NULLs by default)
    if min_ctc is not None and min_ctc > 0:
        q = q.filter(Application.expected_ctc >= min_ctc)
    if max_ctc is not None and max_ctc < 10000000: # Less than 100 Lakhs
        q = q.filter(Application.expected_ctc <= max_ctc)
        
    if min_experience is not None and min_experience > 0:
        q = q.filter(Application.relevant_experience >= min_experience)
    if max_experience is not None and max_experience < 30: # Max in frontend is 30
        q = q.filter(Application.relevant_experience <= max_experience)
        
    # 5. Date Filter
    if days_ago:
        cutoff = datetime.utcnow() - timedelta(days=days_ago)
        q = q.filter(Application.applied_at >= cutoff)
        
    # 6. Pagination & Sorting
    total = q.count()
    
    # Dynamic Order By
    try:
        # Use a local mapping to ensure we use correct column names
        sort_map = {
            "experience": Application.relevant_experience,
            "ctc": Application.expected_ctc,
            "date": Application.applied_at,
            "ats_score": Application.ats_score,
            "applied_at": Application.applied_at
        }
        
        sort_col = sort_map.get(sort_by)
        if sort_col is None:
            sort_col = Application.applied_at
            
        if sort_order == "desc":
            q = q.order_by(sort_col.desc())
        else:
            q = q.order_by(sort_col.asc())
    except Exception as e:
        print(f"Sorting Error: {e}")
        q = q.order_by(Application.applied_at.desc())

    apps = q.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "items": [build_rm_application_response(a, db) for a in apps]
    }

@router.get("/onboarding/candidates", response_model=List[ApplicationResponse])
def get_onboarding_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    from app.models.candidate import Candidate
    apps = db.query(Application).filter(Application.onboarding_status != "NONE").all()
    return [build_rm_application_response(a, db) for a in apps]

@router.post("/onboarding/{app_id}/send-offer")
async def send_offer_letter(
    app_id: int,
    file: UploadFile = File(...),
    deadline_days: int = Form(3),
    email_description: str = Form(...),
    email_subject: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    from app.services.minio_client import upload_file_to_minio
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    candidate = app.candidate
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Upload to MinIO
    file_path = f"offers/{uuid.uuid4()}_{file.filename}"
    upload_file_to_minio(file.file, "offer-letters", file_path)
    
    app.offer_letter_path = file_path
    app.offer_letter_sent = True
    app.onboarding_status = "ONBOARDING_PENDING"
    
    # Derive is_fresher from application
    is_fresher = app.is_first_job or (app.relevant_experience is not None and app.relevant_experience == 0)
    app.is_fresher = is_fresher
    
    db.commit()

    # Send Email to Candidate
    req = app.requisition
    company_name = current_user.company_name or "HireStream"
    subject = email_subject or f"Offer Letter - {company_name}"
    body = email_description
    
    if candidate.user.email:
        if current_user.google_access_token:
            try:
                # Seek to start to read file content for attachment
                await file.seek(0)
                file_content = await file.read()
                
                send_gmail(
                    current_user.google_access_token, 
                    current_user.google_refresh_token,
                    candidate.user.email, 
                    subject, 
                    html_body=body,
                    attachments=[{
                        "name": file.filename,
                        "content": file_content
                    }]
                )
            except Exception as e:
                print(f"FAILED TO SEND OFFER EMAIL via GMAIL: {e}")
        else:
            print("RM GOOGLE NOT CONNECTED - Skipping email")

    # Notify Candidate
    notify_user(
        db,
        user_id=candidate.user_id,
        title="Offer Letter Received",
        message=f"You have received an offer letter for {req.title if req else 'the role'}. Please review and accept.",
        type="onboarding",
        link="/candidate/onboarding"
    )

    return {"message": "Offer letter sent successfully"}

@router.post("/onboarding/{app_id}/verify-document")
def verify_onboarding_document(
    app_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    candidate = app.candidate
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
        
    doc_id = payload.get("doc_id")
    if doc_id in ["pan", "aadhaar", "photo"]:
        app.govt_id_verified = True
        app.photo_verified = True if doc_id == "photo" else app.photo_verified
    elif doc_id == "academic":
        app.academic_verified = True
    elif doc_id == "address":
        app.address_verified = True
    elif doc_id == "experience":
        app.experience_verified = True
    elif doc_id == "relieving":
        app.relieving_verified = True
    elif doc_id == "payslips":
        app.payslips_verified = True
        
    db.commit()
    return {"message": f"Verification successful for {doc_id}"}

@router.post("/onboarding/{app_id}/complete")
def complete_onboarding(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    candidate = app.candidate
    # Validation logic: Ensure essential docs are present
    if not (app.offer_letter_accepted and app.documents_submitted):
        raise HTTPException(status_code=400, detail="Onboarding steps are not yet completed")

    app.onboarding_completed = True
    app.onboarding_status = "COMPLETED"
    
    # Update application status to Hired
    app.status = ApplicationStatus.hired
    
    db.commit()

    # Notify HM
    req = app.requisition
    if req and req.assigned_hm_id:
        notify_user(
            db,
            user_id=req.assigned_hm_id,
            title="Onboarding Completed",
            message=f"Onboarding for {candidate.user.full_name} ({req.title}) is complete.",
            type="onboarding",
            link="/hm/pipeline"
        )

    return {"message": "Onboarding completed successfully"}

@router.get("/onboarding/{app_id}/offer-url")
def get_offer_url(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app or not app.candidate or not app.candidate.offer_letter_path:
        raise HTTPException(status_code=404, detail="Offer letter not found")
        
    from app.services.minio_client import get_presigned_download_url
    url = get_presigned_download_url(app.candidate.offer_letter_path, "offer-letters")
    return {"url": url}

@router.patch("/applications/{id}/move-to-pipeline")
def move_candidate_to_pipeline(
    id: int,
    current_user: User = Depends(require_role(UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    from app.models.application import CandidateStatus
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    app.candidate_status = CandidateStatus.in_pipeline
    db.commit()
    return {"message": "Candidate moved to pipeline", "application": build_rm_application_response(app, db)}

@router.get("/applications/{app_id}", response_model=ApplicationResponse)
def get_application_profile(app_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.resource_manager))):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return build_rm_application_response(app, db)

@router.post("/ats/analyze")
async def analyze_at_rm(
    requisition_id: Optional[int] = Form(None),
    resume: Optional[UploadFile] = File(None),
    application_id: Optional[int] = None, # For JSON requests
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    # This endpoint now handles BOTH:
    # 1. Manual file upload for analysis (Multipart)
    # 2. Analysis of an existing application (JSON)
    
    # Check if this is a JSON request for an existing application
    from app.schemas.application import ATSAnalyzeRequest
    import json
    
    # Handle the case where the frontend sends JSON directly (which causes 422 if we expect Form)
    # Actually, let's just create a secondary route to be safe, but let's try to handle application_id.
    
    if application_id:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app or not app.resume_path:
            raise HTTPException(status_code=404, detail="Application or resume not found")
        
        req = db.query(Requisition).filter(Requisition.id == app.requisition_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requisition not found")
            
        resume_bytes = get_object_content(app.resume_path)
        text = extract_text_from_resume(resume_bytes)
        jd_text = req.job_description or f"{req.title} {req.role} {req.required_skills or ''}"
        result = calculate_ats_score(text, jd_text, req.required_skills)
        
        # Save score and text to application
        app.ats_score = result["score"]
        app.resume_text = text
        db.commit()
        
        return {
            "ats_score": result["score"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"]
        }

    # Manual Upload Path
    if not (requisition_id and resume):
         raise HTTPException(status_code=400, detail="Missing requisition_id or resume file")

    # Save file temporarily
    filename = f"temp_{uuid.uuid4()}_{resume.filename}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(resume.file, f)
    
    try:
        req = db.query(Requisition).filter(Requisition.id == requisition_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requisition not found")
        
        print(f"DEBUG: Manual ATS Scan for req {requisition_id}, file: {resume.filename}")
        text = extract_text_from_resume(filepath)
        print(f"DEBUG: Extracted text length: {len(text)}")
        
        jd_text = req.job_description or f"{req.title} {req.role} {req.required_skills or ''}"
        result = calculate_ats_score(text, jd_text, req.required_skills)
        
        return {
            "ats_score": result["score"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"]
        }
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

@router.post("/ats/analyze-application")
def analyze_existing_app(
    data: ATSAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    app = db.query(Application).filter(Application.id == data.application_id).first()
    if not app or not app.resume_path:
        print(f"DEBUG: Application {data.application_id} not found or no resume_path: {app.resume_path if app else 'No App'}")
        raise HTTPException(status_code=404, detail="Application or resume not found")
    
    req = db.query(Requisition).filter(Requisition.id == app.requisition_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
        
    print(f"DEBUG: Scanning application {data.application_id}, resume_path: {app.resume_path}")
    resume_bytes = get_object_content(app.resume_path)
    if not resume_bytes:
        print(f"DEBUG: Failed to get resume content for {app.id}")
        raise HTTPException(status_code=400, detail="Could not read resume file")
        
    text = extract_text_from_resume(resume_bytes)
    if not text:
        print(f"DEBUG: PDF extraction returned empty text for {app.id}")
        # Note: If extraction fails, we still want to show 0 score rather than 500
        text = ""

    print(f"DEBUG: Extracted text length: {len(text)}")
    jd_text = req.job_description or f"{req.title} {req.role} {req.required_skills or ''}"
    result = calculate_ats_score(text, jd_text, req.required_skills)
    
    # Save score and text to application
    app.ats_score = result["score"]
    app.resume_text = text
    db.commit()
    
    return {
        "ats_score": result["score"],
        "matched_skills": result["matched_skills"],
        "missing_skills": result["missing_skills"]
    }

@router.patch("/applications/{app_id}/status", response_model=ApplicationResponse)
def update_app_status(
    app_id: int,
    update: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    old_status = app.status
    app.status = update.status
    
    if update.rm_rating is not None:
        app.rm_rating = update.rm_rating
    if update.rm_feedback is not None:
        app.rm_feedback = update.rm_feedback
    
    # History record
    history = ApplicationStatusHistory(
        application_id=app_id,
        status=update.status.value,
        notes=update.notes or f"Status changed from {old_status} by Resource Manager"
    )
    db.add(history)
    db.commit()
    db.refresh(app)

    # Notify HM if moved to 'Ready for HM'
    if update.status == ApplicationStatus.ready_for_hm:
        req = db.query(Requisition).filter(Requisition.id == app.requisition_id).first()

        # Auto-assign first available HM if none is assigned
        if req and not req.assigned_hm_id:
            first_hm = db.query(User).filter(User.role == UserRole.hiring_manager).first()
            if first_hm:
                req.assigned_hm_id = first_hm.id
                db.commit()
                db.refresh(req)

        if req and req.assigned_hm_id:
            notify_user(
                db,
                user_id=req.assigned_hm_id,
                title="Candidate Ready for Review",
                message=f"A new candidate for '{req.title}' has been shortlisted and is ready for your review.",
                type="application",
                link="/hm/pipeline"
            )

    # Workflow: Automated Assessment Notification when moving to Assessment Pipeline
    if update.status == ApplicationStatus.assessment and old_status != ApplicationStatus.assessment:
        _trigger_assessment_notification(db, app, current_user)

    return build_rm_application_response(app, db)

from pydantic import BaseModel
class RejectApplicationRequest(BaseModel):
    rejection_reason: Optional[str] = None

@router.post("/applications/{app_id}/reject", response_model=ApplicationResponse)
def reject_application(
    app_id: int,
    data: RejectApplicationRequest = Body(default=RejectApplicationRequest()),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    old_status = app.status
    app.status = ApplicationStatus.rejected

    history = ApplicationStatusHistory(
        application_id=app_id,
        status=ApplicationStatus.rejected.value,
        notes=data.rejection_reason or f"Rejected by {current_user.full_name}"
    )
    db.add(history)
    db.commit()
    db.refresh(app)

    # Notifications
    candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first()
    req = db.query(Requisition).filter(Requisition.id == app.requisition_id).first()
    role_title = req.title if req else "the applied role"

    from app.services.notification_service import notify_user

    # 1. Notify Candidate
    if candidate and candidate.user_id:
        notify_user(
            db,
            user_id=candidate.user_id,
            title="Application Update",
            message=f"We appreciate your interest in {role_title}. Our team has reviewed your application and will not be moving forward at this time.",
            type="status",
            link="/candidate/applications"
        )

    # 2. Notify all RMs
    rms = db.query(User).filter(User.role == UserRole.resource_manager).all()
    candidate_name = candidate.user.full_name if candidate and candidate.user else "A candidate"
    for rm in rms:
        if rm.id != current_user.id:
            notify_user(
                db,
                user_id=rm.id,
                title="Candidate Rejected",
                message=f"{current_user.full_name} rejected {candidate_name}'s application for {role_title}.",
                type="status"
            )

    # 3. Notify assigned HM
    if req and req.assigned_hm_id and req.assigned_hm_id != current_user.id:
        notify_user(
            db,
            user_id=req.assigned_hm_id,
            title="Candidate Rejected",
            message=f"A candidate for your role '{role_title}' has been rejected by {current_user.full_name}.",
            type="status",
            link="/hm/pipeline"
        )

    return build_rm_application_response(app, db)

@router.post("/requisitions/{req_id}/delete")
def delete_requisition_post(req_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.resource_manager))):
    print(f"RM EXPLICIT DELETE for {req_id} by user {current_user.id}")
    req = db.query(Requisition).filter(Requisition.id == req_id).first()
    if not req:
        print(f"Requisition {req_id} not found for deletion")
        raise HTTPException(status_code=404, detail="Requisition not found")
    try:
        db.delete(req)
        db.commit()
        print(f"Requisition {req_id} DELETED")
        return {"success": True, "message": "Requisition and all associated applications deleted"}
    except Exception as e:
        print(f"DELETE ERROR: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/applications/{id}")
def delete_application(id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.resource_manager))):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(app)
    db.commit()
    return {"message": "Application deleted"}

@router.get("/analytics/rm")
def get_rm_analytics(db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.resource_manager))):
    from datetime import datetime, timedelta
    from sqlalchemy import func
    from app.models.interview import Interview

    reqs = db.query(Requisition).filter(Requisition.is_active == True).all()
    all_apps = db.query(Application).all()
    
    # Calculate average applications per role
    avg_apps = len(all_apps) / len(reqs) if reqs else 0
    
    # Talent Distribution (by Role)
    talent_dist_query = db.query(
        Requisition.role, 
        func.count(Requisition.id)
    ).filter(Requisition.is_active == True).group_by(Requisition.role).all()
    
    talent_distribution = [{"name": r or "Other", "value": c} for r, c in talent_dist_query]
    
    # Applicants Volume (Last 7 days)
    today = datetime.utcnow().date()
    applicants_volume = []
    for i in range(6, -1, -1):
        date = today - timedelta(days=i)
        
        apps_count = db.query(Application).filter(
            func.date(Application.applied_at) == date
        ).count()
        
        reqs_count = db.query(Requisition).filter(
            func.date(Requisition.created_at) == date
        ).count()
        
        applicants_volume.append({
            "name": date.strftime("%a"),
            "apps": apps_count,
            "reqs": reqs_count
        })
        
    # Recent Applications
    recent_apps = db.query(Application).order_by(Application.applied_at.desc()).limit(15).all()
    recent_applications = [build_rm_application_response(a, db).dict() for a in recent_apps]
    
    # Interviews Today
    interviews_today_query = db.query(Interview).filter(
        func.date(Interview.scheduled_at) == today
    ).order_by(Interview.scheduled_at).all()
    
    from app.routers.interviews import build_interview_response
    interviews_today = [build_interview_response(i, db).dict() for i in interviews_today_query]
    
    from app.models.requisition import RequisitionStatus
    pending_req_count = db.query(Requisition).filter(Requisition.status == RequisitionStatus.pending).count()
    
    # Global Pipeline Status Counts
    from app.models.application import ApplicationStatus
    status_counts = db.query(Application.status, func.count(Application.id)).group_by(Application.status).all()
    
    # Standardize counts dictionary with string keys (using enum value)
    counts_dict = {s.value: 0 for s in ApplicationStatus}
    for status, count in status_counts:
        if status is None: continue
        # Handle if status is Enum object or string
        key = status.value if hasattr(status, 'value') else str(status)
        counts_dict[key] = count
    
    pipeline_map = {
        'sourcing': 'Applied',
        'screening': 'Screening',
        'internal_shortlist': 'Shortlist',
        'assessment': 'Review',
        'ready_for_hm': 'To HM',
        'offer_extended': 'Offer'
    }
    
    pipeline_data = []
    for key, label in pipeline_map.items():
        pipeline_data.append({
            "name": label, 
            "count": counts_dict.get(key, 0)
        })
    
    return {
        "total": len(all_apps),
        "active_requisitions": len(reqs),
        "candidates_in_pipeline": len(all_apps),
        "ready_for_hm": counts_dict.get('ready_for_hm', 0),
        "offers_extended": counts_dict.get('offer_extended', 0),
        "avg_applications_per_role": round(avg_apps, 1),
        "talent_distribution": talent_distribution,
        "applicants_volume": applicants_volume,
        "recent_applications": recent_applications,
        "interviews_today": interviews_today,
        "pending_hire_requests_count": pending_req_count,
        "pipeline": pipeline_data
    }

# --- Candidate Pipeline Endpoints ---

@router.get("/candidates", response_model=List[CandidateWithUser])
def get_all_candidates_for_pipeline(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    candidates = db.query(Candidate).order_by(Candidate.created_at.desc()).all()
    results = []
    for c in candidates:
        user = c.user
        res = CandidateWithUser.from_orm(c)
        res.full_name = user.full_name if user else "N/A"
        res.email = user.email if user else "N/A"
        results.append(res)
    return results

@router.patch("/candidates/{candidate_id}/status")
def update_candidate_status_rm(
    candidate_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    
    candidate.application_status = new_status
    db.commit()
    return {"message": "Candidate status updated", "candidate_id": candidate_id, "status": new_status}

def _trigger_assessment_notification(db: Session, app: Application, current_user: User, assessment_title: str = None, assessment_instructions: str = "", deadline: str = "Not Specified"):
    """Helper to send both portal and email notifications for assessments."""
    candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first()
    if not candidate or not candidate.user_id: return

    user = candidate.user
    role_name = app.requisition.title if app.requisition else "Open Role"
    company_name = "HireStream" # Could be dynamic from settings if available
    
    # Workflow Update: "System should automatically Assign assessment"
    # If this is a transition without an explicit assessment object passed, create a default one
    final_title = assessment_title or f"{role_name} Assessment"
    
    # Let the Resource Manager manually trigger assessment records via the UI button
    # to maintain clear pipeline visibility and manual control.

    # 1. Portal Notification
    notify_user(
        db,
        user_id=candidate.user_id,
        title="Assessment Assigned – HireStream",
        message=f"You have been assigned an assessment for {role_name}",
        type="assessment",
        link="/candidate/assessments"
    )

    # 2. Email Notification (using RM's credentials)
    if current_user.google_access_token:
        try:
            html_body = f"""
            <div style="font-family: sans-serif; padding: 25px; border: 1px solid #e1e7ef; border-radius: 16px; max-width: 600px; color: #1e293b; margin: auto;">
                <h2 style="margin-top: 0; color: #020617;">Assessment Assigned – HireStream</h2>
                <p>Hello <strong>{user.full_name}</strong>,</p>
                <p>You have been assigned an assessment for the role of <strong>{role_name}</strong>.</p>
                <p>To view the assessment details and complete the assigned task, please log in to your HireStream profile.</p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #f1f5f9;">
                    <p style="margin: 5px 0;"><strong>Assessment:</strong> {final_title}</p>
                    <p style="margin: 5px 0;"><strong>Role:</strong> {role_name}</p>
                    <p style="margin: 5px 0;"><strong>Company:</strong> {company_name}</p>
                    <p style="margin: 5px 0;"><strong>Assigned By:</strong> {current_user.full_name}</p>
                    <p style="margin: 5px 0;"><strong>Deadline:</strong> {deadline}</p>

                <p>Please make sure to complete the assessment within the given timeframe.</p>
                <p>If you have any questions, feel free to contact the hiring team.</p>
                <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
                <p style="font-size: 13px; color: #64748b;">Best Regards,<br />HireStream Hiring Team</p>
            </div>
            """
            
            send_gmail(
                access_token=current_user.google_access_token,
                refresh_token=current_user.google_refresh_token,
                to=user.email,
                subject="Assessment Assigned – HireStream",
                html_body=html_body
            )
            print(f"DEBUG: Assessment email sent to {user.email}")
        except Exception as e:
            print(f"DEBUG: Failed to send assessment email: {str(e)}")
@router.post("/assessments/send", response_model=AssessmentSchema)
def send_assessment(
    data: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    app = db.query(Application).filter(Application.id == data.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Update application status to assessment stage if not already there
    if app.status != ApplicationStatus.assessment:
        old_status = app.status
        app.status = ApplicationStatus.assessment
        history = ApplicationStatusHistory(
            application_id=app.id,
            status=ApplicationStatus.assessment.value,
            notes=f"Moved to assessment stage from {old_status} by {current_user.full_name}"
        )
        db.add(history)

    assessment = Assessment(
        application_id=data.application_id,
        title=data.title,
        instructions=data.instructions,
        file_path=data.file_path,
        deadline=data.deadline,
        status=AssessmentStatus.sent
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    # Trigger Automated Notification Workflow
    _trigger_assessment_notification(
        db, 
        app, 
        current_user, 
        assessment_title=assessment.title, 
        assessment_instructions=assessment.instructions or "", 
        deadline=str(assessment.deadline) if assessment.deadline else "Not Specified"
    )
    
    return assessment

@router.get("/assessments/application/{app_id}", response_model=List[AssessmentSchema])
def get_application_assessments(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    return db.query(Assessment).filter(Assessment.application_id == app_id).all()

@router.get("/acceptance-letter/{app_id}")
def get_acceptance_letter_url(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.resource_manager))
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app or not app.candidate:
        raise HTTPException(status_code=404, detail="Application or candidate profile not found")
        
    candidate = app.candidate
    if not candidate.acceptance_letter_path:
        raise HTTPException(status_code=404, detail="Acceptance letter not found")

    from app.services.minio_client import get_presigned_download_url
    url = get_presigned_download_url(candidate.acceptance_letter_path, bucket_name="acceptance-letters")
    return {"download_url": url}
