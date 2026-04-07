from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class AssessmentStatus(str, enum.Enum):
    not_sent = "not_sent"
    sent = "sent"
    submitted = "submitted"
    reviewed = "reviewed"
    accepted = "accepted"
    rejected = "rejected"

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    
    # Setup details
    title = Column(String)
    instructions = Column(Text, nullable=True)
    file_path = Column(String, nullable=True) # PDF for assessment instructions/details
    deadline = Column(DateTime, nullable=True)
    
    status = Column(Enum(AssessmentStatus), default=AssessmentStatus.sent)
    
    # Submission fields
    submission_file_path = Column(String, nullable=True) # PDF submission
    submission_link = Column(String, nullable=True) # GitHub or Google Drive link
    submitted_at = Column(DateTime, nullable=True)
    
    # Review fields
    score = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    application = relationship("Application", back_populates="assessments")
