from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base

class OTP(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    expiry = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
