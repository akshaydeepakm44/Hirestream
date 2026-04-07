from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class InterviewMode(str, enum.Enum):
    online = "online"
    in_person = "in_person"
    phone = "phone"

class InterviewStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"
    rescheduled = "rescheduled"

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    scheduled_by = Column(Integer, ForeignKey("users.id"))
    scheduled_at = Column(DateTime, nullable=False)
    mode = Column(Enum(InterviewMode), default=InterviewMode.online)
    status = Column(Enum(InterviewStatus), default=InterviewStatus.scheduled)
    location_or_link = Column(String, nullable=True)
    meeting_link = Column(String, nullable=True)
    calendar_event_id = Column(String, nullable=True)
    duration_minutes = Column(Integer, default=30)
    end_time = Column(DateTime, nullable=True) # Explicit end time for lifecycle
    rating = Column(Integer, nullable=True) # 1-5 Stars
    feedback = Column(Text, nullable=True) # Interviewer feedback
    notes = Column(Text, nullable=True)
    participants = Column(Text, nullable=True)
    scheduled_role = Column(String, nullable=True) # "resource_manager" or "hiring_manager"
    created_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("Application", back_populates="interviews")
    scheduler = relationship("User", back_populates="scheduled_interviews", foreign_keys=[scheduled_by])
