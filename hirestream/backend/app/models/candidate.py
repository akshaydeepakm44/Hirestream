from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    experience_years = Column(Float, default=0)
    current_title = Column(String, nullable=True)
    skills = Column(Text, nullable=True)  # comma-separated
    summary = Column(Text, nullable=True)
    resume_path = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)
    notice_period = Column(String, nullable=True) # e.g. "Immediate", "30 days"
    preferred_work_mode = Column(String, nullable=True) # Remote, Hybrid, Onsite
    preferred_location = Column(String, nullable=True)
    application_status = Column(String, default="Applied")
    
    # Profile fields
    dob = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    availability_status = Column(String, nullable=True)
    expected_salary = Column(String, nullable=True)
    preferred_employment_type = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="candidate_profile")
    applications = relationship("Application", back_populates="candidate")
