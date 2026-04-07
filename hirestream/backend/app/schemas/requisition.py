from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime, date
from app.models.requisition import RequisitionStatus

class RequisitionBase(BaseModel):
    title: str
    role: str
    department: Optional[str] = None
    location: Optional[str] = None
    required_skills: Optional[str] = None
    job_description: Optional[str] = None

class RequisitionCreate(RequisitionBase):
    assigned_hm_id: Optional[int] = None
    employment_type: Optional[str] = None
    openings: Optional[int] = 1
    experience_required: Optional[str] = None
    education: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    budget_approved: Optional[bool] = False
    target_joining_date: Optional[date] = None
    urgency: Optional[str] = None
    roles_responsibilities: Optional[str] = None
    nice_to_have_skills: Optional[str] = None

class HireRequestCreate(BaseModel):
    """Schema for Hiring Manager creating a hire request"""
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    openings: Optional[int] = 1
    experience_required: Optional[str] = None
    skills: Optional[str] = None
    education: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    budget_approved: Optional[bool] = False
    target_joining_date: Optional[date] = None
    urgency: Optional[str] = None
    roles_responsibilities: Optional[str] = None
    required_skills_text: Optional[str] = None
    nice_to_have_skills: Optional[str] = None

class RequisitionUpdate(BaseModel):
    title: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    required_skills: Optional[str] = None
    job_description: Optional[str] = None
    status: Optional[RequisitionStatus] = None
    assigned_hm_id: Optional[int] = None
    employment_type: Optional[str] = None
    openings: Optional[int] = None
    experience_required: Optional[str] = None
    education: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    budget_approved: Optional[bool] = None
    target_joining_date: Optional[date] = None
    urgency: Optional[str] = None
    roles_responsibilities: Optional[str] = None
    nice_to_have_skills: Optional[str] = None

class RequisitionResponse(RequisitionBase):
    id: int
    status: RequisitionStatus
    created_by: int
    assigned_hm_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    applicant_count: Optional[int] = 0
    employment_type: Optional[str] = None
    openings: Optional[int] = 1
    experience_required: Optional[str] = None
    education: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    budget_approved: Optional[bool] = False
    target_joining_date: Optional[date] = None
    urgency: Optional[str] = None
    roles_responsibilities: Optional[str] = None
    nice_to_have_skills: Optional[str] = None

    @field_serializer('created_at', 'updated_at')
    def serialize_datetimes(self, value: Optional[datetime]) -> Optional[str]:
        if value is None: return None
        from app.services.time_utils import format_utc_iso
        return format_utc_iso(value)

    class Config:
        from_attributes = True

class JDGenerateRequest(BaseModel):
    title: str
    skills: str
    department: Optional[str] = None
    location: Optional[str] = None
