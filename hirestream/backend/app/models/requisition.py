from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime, Boolean, Float, Date
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class RequisitionStatus(str, enum.Enum):
    pending = "pending"
    open = "open"
    closed = "closed"
    on_hold = "on_hold"
    rejected = "rejected"

class Requisition(Base):
    __tablename__ = "requisitions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    role = Column(String, nullable=False)
    department = Column(String, nullable=True)
    location = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)  # Full-time, Contract, Internship
    openings = Column(Integer, default=1)
    experience_required = Column(String, nullable=True)
    required_skills = Column(Text, nullable=True)  # comma-separated
    education = Column(String, nullable=True)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    budget_approved = Column(Boolean, default=False)
    target_joining_date = Column(Date, nullable=True)
    urgency = Column(String, nullable=True)  # High, Medium, Low
    job_description = Column(Text, nullable=True)
    roles_responsibilities = Column(Text, nullable=True)
    nice_to_have_skills = Column(Text, nullable=True)
    status = Column(Enum(RequisitionStatus, name='requisitionstatus', create_constraint=False), default=RequisitionStatus.open)
    created_by = Column(Integer, ForeignKey("users.id"))
    assigned_hm_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", back_populates="requisitions", foreign_keys=[created_by])
    assigned_hm = relationship("User", foreign_keys=[assigned_hm_id])
    applications = relationship("Application", back_populates="requisition", cascade="all, delete-orphan", passive_deletes=True)
