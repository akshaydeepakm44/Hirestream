from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"))
    status = Column(String)
    changed_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)

    application = relationship("Application", back_populates="status_history")
