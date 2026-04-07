from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime

class CandidateBase(BaseModel):
    phone: Optional[str] = None
    location: Optional[str] = None
    experience_years: Optional[float] = 0
    current_title: Optional[str] = None
    skills: Optional[str] = None
    summary: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    notice_period: Optional[str] = None
    preferred_work_mode: Optional[str] = None
    preferred_location: Optional[str] = None
    application_status: Optional[str] = "Applied"
    dob: Optional[str] = None
    gender: Optional[str] = None
    availability_status: Optional[str] = None
    expected_salary: Optional[str] = None
    preferred_employment_type: Optional[str] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(CandidateBase):
    pass

class CandidateResponse(CandidateBase):
    id: int
    user_id: int
    resume_path: Optional[str] = None
    application_status: Optional[str] = "sourcing"
    created_at: datetime

    @field_serializer('created_at')
    def serialize_created_at(self, value: datetime) -> str:
        from app.services.time_utils import format_utc_iso
        return format_utc_iso(value)

    class Config:
        from_attributes = True

class CandidateWithUser(CandidateResponse):
    full_name: str
    email: str
