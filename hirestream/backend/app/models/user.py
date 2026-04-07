from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    candidate = "candidate"
    hiring_manager = "hiring_manager"
    resource_manager = "resource_manager"
    super_admin = "super_admin"

class UserStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole, create_type=False), nullable=False)
    is_active = Column(Boolean, default=True)
    status = Column(Enum(UserStatus, create_type=False), default=UserStatus.approved)
    
    # Registration details for HM/RM
    company_name = Column(String, nullable=True)
    department = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    location = Column(String, nullable=True)
    specialization = Column(String, nullable=True) # For RM
    
    google_id = Column(String, index=True, nullable=True)
    profile_picture = Column(String, nullable=True)
    google_access_token = Column(String, nullable=True)
    google_refresh_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('email', 'role', name='_email_role_uc'),
    )

    @property
    def has_google_connected(self) -> bool:
        return bool(self.google_access_token)

    # Relationships
    candidate_profile = relationship("Candidate", back_populates="user", uselist=False, cascade="all, delete-orphan")
    requisitions = relationship("Requisition", back_populates="creator", foreign_keys="Requisition.created_by")
    scheduled_interviews = relationship("Interview", back_populates="scheduler", foreign_keys="Interview.scheduled_by")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
