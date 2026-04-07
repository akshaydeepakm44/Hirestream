from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class ApplicationStatus(str, enum.Enum):
    sourcing = "sourcing"
    screening = "screening"
    internal_shortlist = "internal_shortlist"
    assessment = "assessment"
    ready_for_hm = "ready_for_hm"
    interviewing = "interviewing"
    onboarding = "onboarding"
    rejected = "rejected"
    offer_extended = "offer_extended"
    hired = "hired"

class CandidateStatus(str, enum.Enum):
    applied = "applied"
    in_pipeline = "in_pipeline"
    rejected = "rejected"
    archived = "archived"

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE")) #here cascade is used to delete the application if the candidate is deleted
    requisition_id = Column(Integer, ForeignKey("requisitions.id", ondelete="CASCADE")) 
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.sourcing) #here enum is used to define the status of the application
    candidate_status = Column(Enum(CandidateStatus), default=CandidateStatus.applied)
    resume_path = Column(String, nullable=True) #here string is used to store the path of the resume
    resume_text = Column(Text, nullable=True) #here text is used to store the text of the resume
    ats_score = Column(Float, nullable=True) #here float is used to store the ats score
    cover_letter = Column(Text, nullable=True) #here text is used to store the cover letter
    
    # Basic Application Info
    is_fresher = Column(Boolean, default=True)
    dob = Column(String, nullable=True)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)

    # Education
    school = Column(String, nullable=True)
    degree = Column(String, nullable=True)
    degree_of_study = Column(String, nullable=True)
    area_of_study = Column(String, nullable=True)
    education_country = Column(String, nullable=True)

    # Experience
    is_first_job = Column(Boolean, default=False)
    current_ctc = Column(Float, nullable=True)
    expected_ctc = Column(Float, nullable=True)
    willing_to_relocate = Column(Boolean, default=False)
    available_start_date = Column(String, nullable=True)
    work_mode_preference = Column(String, nullable=True) # Remote, Onsite, Hybrid
    relevant_experience = Column(Float, nullable=True)
    current_role_title = Column(String, nullable=True)
    domain_experience = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)
    screening_answers = Column(Text, nullable=True)

    notes = Column(Text, nullable=True)
    rm_rating = Column(Integer, nullable=True)
    rm_feedback = Column(Text, nullable=True)
    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Onboarding workflow (Role-Specific)
    onboarding_status = Column(String, default="NONE") 
    onboarding_completed = Column(Boolean, default=False)
    offer_letter_sent = Column(Boolean, default=False)
    offer_letter_accepted = Column(Boolean, default=False)
    documents_submitted = Column(Boolean, default=False)
    
    # Verification states
    govt_id_verified = Column(Boolean, default=False)
    academic_verified = Column(Boolean, default=False)
    address_verified = Column(Boolean, default=False)
    photo_verified = Column(Boolean, default=False)
    experience_verified = Column(Boolean, default=False)
    relieving_verified = Column(Boolean, default=False)
    payslips_verified = Column(Boolean, default=False)
    
    # Onboarding File Paths
    offer_letter_path = Column(String, nullable=True)
    acceptance_letter_path = Column(String, nullable=True)
    aadhaar_path = Column(String, nullable=True)
    pan_path = Column(String, nullable=True)
    address_proof_path = Column(String, nullable=True)
    education_docs_path = Column(String, nullable=True)
    photo_path = Column(String, nullable=True)
    experience_docs_path = Column(String, nullable=True)
    relieving_letter_path = Column(String, nullable=True)
    payslips_path = Column(String, nullable=True)

    candidate = relationship("Candidate", back_populates="applications")
    requisition = relationship("Requisition", back_populates="applications")
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan", passive_deletes=True)
    assessments = relationship("Assessment", back_populates="application", cascade="all, delete-orphan", passive_deletes=True)
    status_history = relationship("ApplicationStatusHistory", back_populates="application", cascade="all, delete-orphan", passive_deletes=True)
