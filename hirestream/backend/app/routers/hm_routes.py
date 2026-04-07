from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timezone
from dateutil import parser

from app.database import get_db
from app.models.user import User, UserRole
from app.models.requisition import Requisition, RequisitionStatus
from app.models.application import Application, ApplicationStatus
from app.models.status_history import ApplicationStatusHistory
from app.models.interview import Interview
from app.models.candidate import Candidate
from app.routers.auth import require_role
from app.schemas.requisition import RequisitionCreate # Assuming this exists or using dict

router = APIRouter(prefix="/hm", tags=["Hiring Manager Dashboard"])

# 1. GET /requisitions/me - Return requisitions assigned to this hiring manager
@router.get("/requisitions/me")
def get_my_requisitions(current_user: User = Depends(require_role(UserRole.hiring_manager)), db: Session = Depends(get_db)):
    return db.query(Requisition).filter(Requisition.assigned_hm_id == current_user.id).all()

# 2. POST /requisitions - Create hiring request
@router.post("/requisitions")
def create_requisition(
    data: dict = Body(...), 
    current_user: User = Depends(require_role(UserRole.hiring_manager)), 
    db: Session = Depends(get_db)
):
    # skills is expected as JSON array in prompt, our model uses Text (comma separated)
    skills_str = ",".join(data.get("skills", [])) if isinstance(data.get("skills"), list) else data.get("skills", "")
    
    new_req = Requisition(
        title=data.get("title"),
        role=data.get("role", data.get("title")), # fallback to title if role not provided
        department=data.get("department"),
        location=data.get("location"),
        required_skills=skills_str,
        job_description=data.get("description"),
        assigned_hm_id=current_user.id,
        created_by=current_user.id,
        status=RequisitionStatus.open,
        is_active=True
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return new_req

# --- Hire Request Flow (Pending → RM Approval) ---
from app.schemas.requisition import HireRequestCreate

@router.post("/hire-requests")
def create_hire_request(
    data: HireRequestCreate,
    current_user: User = Depends(require_role(UserRole.hiring_manager)),
    db: Session = Depends(get_db)
):
    """HM creates a hire request that starts as 'pending' until RM approves."""
    new_req = Requisition(
        title=data.title,
        role=data.title,  # use title as role
        department=data.department,
        location=data.location,
        employment_type=data.employment_type,
        openings=data.openings or 1,
        experience_required=data.experience_required,
        required_skills=data.skills,
        education=data.education,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
        budget_approved=data.budget_approved or False,
        target_joining_date=data.target_joining_date,
        urgency=data.urgency,
        roles_responsibilities=data.roles_responsibilities,
        job_description=data.required_skills_text,  # map required_skills_text to job_description
        nice_to_have_skills=data.nice_to_have_skills,
        assigned_hm_id=current_user.id,
        created_by=current_user.id,
        status=RequisitionStatus.pending,
        is_active=False
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    
    # Notify RMs
    from app.services.notification_service import notify_all_resource_managers
    notify_all_resource_managers(
        db, 
        title="New Hire Request", 
        message=f"{current_user.full_name} created a new request for {new_req.title}.",
        type="requisition",
        link="/rm/hire-requests"
    )
    
    return new_req

@router.get("/hire-requests")
def get_my_hire_requests(
    current_user: User = Depends(require_role(UserRole.hiring_manager)),
    db: Session = Depends(get_db)
):
    """Get all hire requests created by this HM."""
    return db.query(Requisition).filter(
        Requisition.created_by == current_user.id
    ).order_by(Requisition.created_at.desc()).all()


# 3. PATCH /requisitions/{id} - Update requisition status
@router.patch("/requisitions/{id}")
def update_requisition_status(
    id: int, 
    status: str = Body(..., embed=True), 
    current_user: User = Depends(require_role(UserRole.hiring_manager)), 
    db: Session = Depends(get_db)
):
    req = db.query(Requisition).filter(Requisition.id == id, Requisition.assigned_hm_id == current_user.id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found or unauthorized")
    
    if status in [s.value for s in RequisitionStatus]:
        req.status = RequisitionStatus(status)
        db.commit()
        return req
    raise HTTPException(status_code=400, detail="Invalid status")

# 4. GET /applications - Return applications only for HM’s requisitions
@router.get("/applications")
def get_hm_applications(current_user: User = Depends(require_role(UserRole.hiring_manager)), db: Session = Depends(get_db)):
    req_ids = [r.id for r in db.query(Requisition.id).filter(Requisition.assigned_hm_id == current_user.id).all()]
    if not req_ids:
        return []
    
    # HM should only see candidates who have reached ready_for_hm or beyond
    apps = db.query(Application).filter(
        Application.requisition_id.in_(req_ids),
        Application.status.notin_([
            ApplicationStatus.sourcing,
            ApplicationStatus.screening,
            ApplicationStatus.internal_shortlist,
            ApplicationStatus.assessment
        ])
    )\
        .options(joinedload(Application.candidate).joinedload(Candidate.user))\
        .options(joinedload(Application.requisition))\
        .all()
    
    results = []
    from app.routers.interviews import build_interview_response
    for app in apps:
        candidate_user = app.candidate.user if app.candidate else None
        candidate = app.candidate

        # Filter interviews to only show HM specific ones
        hm_interviews = [
            build_interview_response(i, db).dict() 
            for i in app.interviews 
            if i.scheduled_role == UserRole.hiring_manager
        ]

        results.append({
            "id": app.id,
            "candidate_name": candidate_user.full_name if candidate_user else "N/A",
            "candidate_email": candidate_user.email if candidate_user else "",
            "candidate_skills": (candidate.skills or "") if candidate else "",
            "candidate_experience": candidate.experience_years if candidate else 0,
            "candidate_summary": (candidate.summary or "") if candidate else "",
            "requisition_title": app.requisition.title if app.requisition else "N/A",
            "requisition_id": app.requisition_id,
            "status": app.status.value if hasattr(app.status, 'value') else str(app.status),
            "ats_score": app.ats_score,
            "applied_at": app.applied_at,
            "rm_rating": app.rm_rating,
            "rm_feedback": app.rm_feedback,
            "interviews": hm_interviews
        })
    return results

# 5. PATCH /applications/{id}/status
@router.patch("/applications/{id}/status")
def update_application_status(
    id: int, 
    status: str = Body(..., embed=True), 
    current_user: User = Depends(require_role(UserRole.hiring_manager)), 
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Verify HM owns the requisition
    req = db.query(Requisition).filter(Requisition.id == app.requisition_id, Requisition.assigned_hm_id == current_user.id).first()
    if not req:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # transitions allowed for HM - covering all visible pipeline stages
    allowed_statuses = ["ready_for_hm", "interviewing", "onboarding", "rejected", "offer_extended"]
    internal_status = None
    
    # Check lowercase first
    if status.lower() in [s.lower() for s in allowed_statuses]:
        internal_status = status.lower()
    else:
        # Check if they sent the display label
        status_map = {
            "Review": "ready_for_hm",
            "Interviewing": "interviewing", 
            "Interview": "interviewing",
            "Onboarding": "onboarding", 
            "Hired": "onboarding",
            "Rejected": "rejected",
            "Offer": "offer_extended",
            "Offer Extended": "offer_extended"
        }
        internal_status = status_map.get(status) if status in status_map else status_map.get(status.title())

    if not internal_status:
        raise HTTPException(status_code=400, detail=f"Invalid status transition for HM: '{status}'")

    status = internal_status

    app.status = ApplicationStatus(status)
    
    # Side effects for Onboarding
    if status == "onboarding":
        app.onboarding_status = "ONBOARDING_PENDING"
        
        # Notify RMs
        from app.services.notification_service import notify_all_resource_managers
        notify_all_resource_managers(
            db,
            title="New Candidate Ready for Onboarding",
            message=f"Candidate {app.candidate.user.full_name if app.candidate and app.candidate.user else 'A candidate'} is ready for onboarding for the role: {req.title if req else 'N/A'}.",
            type="onboarding",
            link="/rm/dashboard?tab=administration"
        )

    # History
    history = ApplicationStatusHistory(application_id=app.id, status=status)
    db.add(history)
    db.commit()
    return {"message": "Status updated", "status": status}

# 6. POST /interviews - Schedule interview
@router.post("/interviews")
def schedule_interview(
    data: dict = Body(...), 
    current_user: User = Depends(require_role(UserRole.hiring_manager)), 
    db: Session = Depends(get_db)
):
    # Verify application belongs to HM
    app = db.query(Application).filter(Application.id == data.get("application_id")).first()
    if not app:
         raise HTTPException(status_code=404, detail="Application not found")
    
    req = db.query(Requisition).filter(Requisition.id == app.requisition_id, Requisition.assigned_hm_id == current_user.id).first()
    if not req:
        raise HTTPException(status_code=403, detail="Unauthorized")

    dt_str = data.get("datetime")
    if not dt_str:
        raise HTTPException(status_code=400, detail="Missing datetime")

    # Parse and enforce UTC
    try:
        # Use dateutil parser to respect offsets like +05:30
        dt_aware = parser.isoparse(dt_str)
        if dt_aware.tzinfo:
            utc_dt = dt_aware.astimezone(timezone.utc).replace(tzinfo=None)
        else:
            utc_dt = dt_aware
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid datetime format. Expected ISO 8601.")

    new_interview = Interview(
        application_id=data.get("application_id"),
        scheduled_at=utc_dt,
        mode=data.get("mode"),
        scheduled_by=current_user.id,
        status="scheduled",
        scheduled_role=current_user.role
    )
    
    # Google Meet Integration
    if current_user.google_access_token:
        try:
            from app.services.google_service import create_google_meet
            candidate_user = db.query(User).join(Candidate).join(Application).filter(Application.id == app.id).first()
            if candidate_user:
                meet_data = create_google_meet(
                    access_token=current_user.google_access_token,
                    refresh_token=current_user.google_refresh_token,
                    candidate_email=candidate_user.email,
                    start_time=new_interview.scheduled_at,
                    duration_minutes=30,
                    title=f"Interview: {candidate_user.full_name} for {app.requisition.title if app.requisition else 'Role'}",
                    description="Technical Interview scheduled by Hiring Manager"
                )
                new_interview.meeting_link = meet_data.get("meet_link")
                new_interview.calendar_event_id = meet_data.get("event_id")
        except Exception as e:
            print(f"Google Calendar integration failed for HM: {e}")

    db.add(new_interview)
    # Also update app status to interviewing if not already
    app.status = ApplicationStatus.interviewing
    db.commit()
    return {"message": "Interview scheduled", "meeting_link": new_interview.meeting_link}

# 7. GET /interviews - Return upcoming interviews for HM
@router.get("/interviews")
def get_my_interviews(current_user: User = Depends(require_role(UserRole.hiring_manager)), db: Session = Depends(get_db)):
    interviews = db.query(Interview).filter(Interview.scheduled_by == current_user.id).all()
    results = []
    for i in interviews:
        app = db.query(Application).filter(Application.id == i.application_id).first()
        candidate = app.candidate.user.full_name if app and app.candidate and app.candidate.user else "N/A"
        role = app.requisition.title if app and app.requisition else "N/A"
        results.append({
            "candidate": candidate,
            "role": role,
            "datetime": i.scheduled_at,
            "mode": i.mode,
            "status": i.status,
            "meeting_link": i.meeting_link,
            "calendar_event_id": i.calendar_event_id
        })
    return results

# 9. GET /analytics - Centralized analytics data for HM dashboard
@router.get("/analytics")
def get_hm_analytics(current_user: User = Depends(require_role(UserRole.hiring_manager)), db: Session = Depends(get_db)):
    # 1. Requisition stats
    my_reqs = db.query(Requisition).filter(Requisition.assigned_hm_id == current_user.id).all()
    req_ids = [r.id for r in my_reqs]
    active_roles = db.query(Requisition).filter(Requisition.assigned_hm_id == current_user.id, Requisition.status == RequisitionStatus.open).count()
    
    # 2. Application stats
    if not req_ids:
        return {
            "total_roles": len(my_reqs),
            "active_roles": active_roles,
            "total_applicants": 0,
            "ready_for_review": 0,
            "interviewing": 0,
            "offers_onboarding": 0,
            "scheduled_interviews": 0,
            "velocity": [],
            "distribution": [
                {"name": "Review", "count": 0},
                {"name": "Interview", "count": 0},
                {"name": "Offer", "count": 0},
                {"name": "Hired", "count": 0}
            ]
        }

    apps_query = db.query(Application).filter(Application.requisition_id.in_(req_ids))
    total_applicants = apps_query.count()
    
    # Details by status
    review_count = apps_query.filter(Application.status.in_([ApplicationStatus.ready_for_hm])).count()
    interview_count = apps_query.filter(Application.status == ApplicationStatus.interviewing).count()
    offer_count = apps_query.filter(Application.status == ApplicationStatus.offer_extended).count()
    hired_count = apps_query.filter(Application.status == ApplicationStatus.onboarding).count()
    
    # Interviews
    scheduled_interviews = db.query(Interview).filter(Interview.scheduled_by == current_user.id, Interview.status == "scheduled").count()
    
    # Velocity (Past 6 months simplified for SQLite)
    apps = apps_query.order_by(Application.applied_at).all()
    velocity_map = {}
    for a in apps:
        if a.applied_at:
            m = a.applied_at.strftime("%b")
            velocity_map[m] = velocity_map.get(m, 0) + 1
    
    velocity = [{"name": m, "count": count} for m, count in velocity_map.items()]
    
    # Default if no data
    if not velocity:
        velocity = [{"name": "Current", "count": total_applicants}]

    return {
        "total_roles": len(my_reqs),
        "active_roles": active_roles,
        "total_applicants": total_applicants,
        "ready_for_review": review_count,
        "candidates_in_interview": interview_count,
        "offers_extended": offer_count + hired_count,
        "scheduled_interviews": scheduled_interviews,
        "velocity": velocity,
        "distribution": [
            {"name": "Screening", "count": review_count},
            {"name": "Interview", "count": interview_count},
            {"name": "Offer", "count": offer_count},
            {"name": "Hired", "count": hired_count}
        ]
    }
