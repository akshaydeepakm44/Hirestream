from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.routers.auth import get_current_user
from pydantic import BaseModel, field_serializer
from datetime import datetime, timezone

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    @field_serializer('created_at')
    def serialize_created_at(self, value: datetime) -> str:
        from app.services.time_utils import format_utc_iso
        return format_utc_iso(value)

    class Config:
        from_attributes = True

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    limit: Optional[int] = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notifications for current user. Use limit=200 for the full activity page."""
    # Cap at 500 to avoid abuse
    safe_limit = min(limit or 50, 500)
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(safe_limit).all()

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get count of unread notifications."""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"count": count}

@router.patch("/{id}/read")
def mark_as_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}

@router.patch("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read for current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).update({"is_read": True})
    db.commit()
    return {"message": "All marked as read"}
