from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.user_settings import UserSettings
from app.routers.auth import get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    profile_picture_url: Optional[str] = None
    location: Optional[str] = None
    company_name: Optional[str] = None
    employee_id: Optional[str] = None

    email_notifications: Optional[bool] = None
    in_app_notifications: Optional[bool] = None
    candidate_updates: Optional[bool] = None
    interview_notifications: Optional[bool] = None
    jd_approval_notifications: Optional[bool] = None
    hire_request_notifications: Optional[bool] = None
    pipeline_notifications: Optional[bool] = None
    ats_alerts: Optional[bool] = None

    default_employment_type: Optional[str] = None
    default_location: Optional[str] = None
    default_experience_min: Optional[int] = None
    default_experience_max: Optional[int] = None
    default_hiring_priority: Optional[str] = None

    default_view: Optional[str] = None
    items_per_page: Optional[int] = None
    candidate_view_preference: Optional[str] = None

class SettingsResponse(SettingsUpdate):
    id: int
    user_id: int
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    joined_date: Optional[str] = None
    last_login: Optional[str] = None

    class Config:
        from_attributes = True

def _get_or_create_settings(db: Session, user: User) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.get("", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get settings for the current user, creating defaults."""
    settings = _get_or_create_settings(db, current_user)
    
    # Very manual extraction to avoid Pydantic/SQLAlchemy type conversion issues
    data = {
        "id": settings.id,
        "user_id": settings.user_id,
        "phone": settings.phone,
        "designation": settings.designation,
        "department": settings.department,
        "profile_picture_url": settings.profile_picture_url,
        "location": settings.location,
        "company_name": settings.company_name,
        "employee_id": settings.employee_id,
        
        "email_notifications": settings.email_notifications,
        "in_app_notifications": settings.in_app_notifications,
        "candidate_updates": settings.candidate_updates,
        "interview_notifications": settings.interview_notifications,
        "jd_approval_notifications": settings.jd_approval_notifications,
        "hire_request_notifications": settings.hire_request_notifications,
        "pipeline_notifications": settings.pipeline_notifications,
        "ats_alerts": settings.ats_alerts,
        
        "default_employment_type": settings.default_employment_type,
        "default_location": settings.default_location,
        "default_experience_min": settings.default_experience_min,
        "default_experience_max": settings.default_experience_max,
        "default_hiring_priority": settings.default_hiring_priority,
        "default_view": settings.default_view,
        "items_per_page": settings.items_per_page,
        "candidate_view_preference": settings.candidate_view_preference,
        
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
        "joined_date": current_user.created_at.strftime("%B %d, %Y") if current_user.created_at else "Recently",
        "last_login": "Just now"
    }
    
    return SettingsResponse(**data)

@router.get("/profile/stats")
def get_profile_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        from app.models.requisition import Requisition
        from app.models.application import Application
        
        if str(current_user.role.value) == "hiring_manager":
            roles_count = db.query(Requisition).filter(Requisition.created_by == current_user.id).count()
            candidates = db.query(Application).join(Requisition).filter(Requisition.created_by == current_user.id).count()
            return {
                "roles_created": roles_count,
                "active_hiring_requests": roles_count,
                "candidates_managed": candidates,
                "joined_date": current_user.created_at.strftime("%B %d, %Y") if current_user.created_at else "Recently"
            }
        else:
            approved = db.query(Requisition).count()
            candidates = db.query(Application).count()
            return {
                "hiring_requests_approved": approved,
                "candidates_managed": candidates,
                "active_pipelines": 5,
                "teams_managed": 3,
                "joined_date": current_user.created_at.strftime("%B %d, %Y") if current_user.created_at else "Recently"
            }
    except Exception as e:
        print(f"Stats Error: {e}")
        return {}

@router.put("", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update settings for the current user."""
    settings = _get_or_create_settings(db, current_user)
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return get_settings(db, current_user) #reuse safely

@router.patch("/profile")
def update_profile(
    full_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update the user's display name."""
    if full_name:
        current_user.full_name = full_name
        db.commit()
    return {"message": "Profile updated"}
