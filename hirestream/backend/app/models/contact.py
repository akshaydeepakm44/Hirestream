from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.database import Base

class ContactRequest(Base):
    __tablename__ = "contact_requests"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="new") # new, read, responded
