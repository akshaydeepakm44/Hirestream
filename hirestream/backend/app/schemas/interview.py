from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime
from app.models.interview import InterviewMode, InterviewStatus

class InterviewCreate(BaseModel):
    application_id: int
    scheduled_at: datetime
    mode: InterviewMode = InterviewMode.online
    location_or_link: Optional[str] = None
    duration_minutes: Optional[int] = 30
    notes: Optional[str] = None
    participants: Optional[list[str]] = []

class InterviewUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    mode: Optional[InterviewMode] = None
    status: Optional[InterviewStatus] = None
    location_or_link: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: Optional[int] = None
    rating: Optional[int] = None
    feedback: Optional[str] = None

class InterviewReview(BaseModel):
    rating: int 
    feedback: str

class InterviewResponse(BaseModel):
    id: int
    application_id: int
    scheduled_by: int
    scheduled_at: datetime
    mode: InterviewMode
    status: InterviewStatus
    location_or_link: Optional[str] = None
    meeting_link: Optional[str] = None
    calendar_event_id: Optional[str] = None
    duration_minutes: Optional[int] = 30
    end_time: Optional[datetime] = None
    rating: Optional[int] = None
    feedback: Optional[str] = None
    notes: Optional[str] = None
    participants: Optional[str] = ""
    scheduled_role: Optional[str] = None
    created_at: datetime

    @field_serializer('scheduled_at', 'end_time', 'created_at')
    def serialize_datetimes(self, value: Optional[datetime]) -> Optional[str]:
        if value is None: return None
        from app.services.time_utils import format_utc_iso
        return format_utc_iso(value)

    # Nested info
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    requisition_title: Optional[str] = None
    requisition_role: Optional[str] = None

    class Config:
        from_attributes = True
