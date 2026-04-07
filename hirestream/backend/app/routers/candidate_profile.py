from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.candidate import Candidate
from app.models.user_settings import UserSettings
from app.routers.auth import require_role
from app.schemas.candidate import CandidateUpdate, CandidateWithUser
from app.routers.settings import _get_or_create_settings, SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/candidate", tags=["Candidate Profile & Settings"])

@router.get("/profile", response_model=CandidateWithUser)
def get_candidate_profile(
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    resp = CandidateWithUser.model_validate(candidate)
    resp.full_name = current_user.full_name
    resp.email = current_user.email
    return resp

@router.put("/profile", response_model=CandidateWithUser)
def update_candidate_profile(
    payload: CandidateUpdate,
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    # Update candidate model fields
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(candidate, key):
            setattr(candidate, key, value)
    
    # Update user full name if provided in payload (needs model update if payload includes it)
    # For now, we'll assume the frontend might send it or use a separate PATCH.
    # Actually, let's allow updating full_name through here if we add it to schema.
    
    db.commit()
    db.refresh(candidate)
    
    resp = CandidateWithUser.model_validate(candidate)
    resp.full_name = current_user.full_name
    resp.email = current_user.email
    return resp

@router.get("/settings")
def get_candidate_settings(
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    settings = _get_or_create_settings(db, current_user)
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    
    # Merge UserSettings and Candidate Preferences
    return {
        "notifications": {
            "application_updates": settings.candidate_updates,
            "interview_notifications": settings.interview_notifications
        },
        "job_preferences": {
            "preferred_role": candidate.current_title if candidate else None,
            "preferred_location": candidate.preferred_location if candidate else None,
            "employment_type": candidate.preferred_employment_type if candidate else "Full-Time"
        },
        "dashboard": {
            "default_view": settings.default_view or "Grid",
            "items_per_page": settings.items_per_page or 10
        }
    }

@router.put("/settings")
def update_candidate_settings(
    payload: dict,
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    settings = _get_or_create_settings(db, current_user)
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    
    # Update notification settings
    if "notifications" in payload:
        n = payload["notifications"]
        settings.candidate_updates = n.get("application_updates", settings.candidate_updates)
        settings.interview_notifications = n.get("interview_notifications", settings.interview_notifications)
    
    # Update job preferences in Candidate model
    if "job_preferences" in payload and candidate:
        jp = payload["job_preferences"]
        candidate.current_title = jp.get("preferred_role", candidate.current_title)
        candidate.preferred_location = jp.get("preferred_location", candidate.preferred_location)
        candidate.preferred_employment_type = jp.get("employment_type", candidate.preferred_employment_type)
    
    # Update dashboard
    if "dashboard" in payload:
        d = payload["dashboard"]
        settings.default_view = d.get("default_view", settings.default_view)
        settings.items_per_page = d.get("items_per_page", settings.items_per_page)
        
    db.commit()
    return {"message": "Settings Saved Successfully"}
