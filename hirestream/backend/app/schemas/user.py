from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional
from datetime import datetime
from app.models.user import UserRole, UserStatus

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole

class UserCreate(UserBase):
    password: str
    company_name: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    specialization: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    status: UserStatus
    company_name: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    specialization: Optional[str] = None
    created_at: datetime
    has_google_connected: bool

    @field_serializer('created_at')
    def serialize_created_at(self, value: datetime) -> str:
        from app.services.time_utils import format_utc_iso
        return format_utc_iso(value)

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str
    role: UserRole

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class UserApproveRequest(BaseModel):
    user_id: int
    approve: bool # True for approve, False for reject
