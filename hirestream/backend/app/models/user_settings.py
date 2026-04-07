from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON
from app.database import Base
from sqlalchemy.orm import relationship

class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Profile
    phone = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    department = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)
    location = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    employee_id = Column(String, nullable=True)

    # Notification Prefs
    email_notifications = Column(Boolean, default=True)
    in_app_notifications = Column(Boolean, default=True)
    candidate_updates = Column(Boolean, default=True)
    interview_notifications = Column(Boolean, default=True)
    jd_approval_notifications = Column(Boolean, default=True)
    hire_request_notifications = Column(Boolean, default=True)
    pipeline_notifications = Column(Boolean, default=True)
    ats_alerts = Column(Boolean, default=True)

    # Hiring Preferences (HM-specific)
    default_employment_type = Column(String, nullable=True, default="Full-time")
    default_location = Column(String, nullable=True)
    default_experience_min = Column(Integer, nullable=True, default=0)
    default_experience_max = Column(Integer, nullable=True, default=10)
    default_hiring_priority = Column(String, nullable=True, default="Medium")

    # Dashboard Preferences
    default_view = Column(String, nullable=True, default="table")
    items_per_page = Column(Integer, nullable=True, default=10)
    candidate_view_preference = Column(String, nullable=True, default="table")

    user = relationship("User", backref="settings")
