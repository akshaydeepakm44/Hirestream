from pydantic import BaseModel, field_serializer
from datetime import datetime
from typing import Optional, List
from app.models.assessment import AssessmentStatus

class AssessmentBase(BaseModel):
    title: str
    instructions: Optional[str] = None
    deadline: Optional[datetime] = None

    @field_serializer('deadline')
    def serialize_deadline(self, value: Optional[datetime]) -> Optional[str]:
        if value is None: return None
        from app.services.time_utils import format_utc_iso
        return format_utc_iso(value)

class AssessmentCreate(AssessmentBase):
    application_id: int
    file_path: Optional[str] = None

class AssessmentUpdate(BaseModel):
    status: Optional[AssessmentStatus] = None
    score: Optional[int] = None
    feedback: Optional[str] = None

class AssessmentSubmission(BaseModel):
    submission_file_path: Optional[str] = None
    submission_link: Optional[str] = None

class AssessmentSchema(AssessmentBase):
    id: int
    application_id: int
    file_path: Optional[str] = None
    status: AssessmentStatus
    submission_file_path: Optional[str] = None
    submission_link: Optional[str] = None
    submitted_at: Optional[datetime] = None
    score: Optional[int] = None
    feedback: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    @field_serializer('submitted_at', 'created_at', 'updated_at', 'reviewed_at')
    def serialize_datetimes(self, value: Optional[datetime]) -> Optional[str]:
        if value is None: return None
        from app.services.time_utils import format_utc_iso
        return format_utc_iso(value)

    class Config:
        from_attributes = True
