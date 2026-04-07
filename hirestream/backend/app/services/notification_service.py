from sqlalchemy.orm import Session
from app.models.notification import Notification

def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str,
    link: str = None
):
    """Utility to create a notification for a user."""
    new_notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link
    )
    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)
    return new_notif

def notify_all_resource_managers(
    db: Session,
    title: str,
    message: str,
    type: str,
    link: str = None
):
    """Creates a notification for all users with 'resource_manager' role."""
    from app.models.user import User, UserRole
    rms = db.query(User).filter(User.role == UserRole.resource_manager).all()
    for rm in rms:
        create_notification(db, rm.id, title, message, type, link)

def notify_user(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str,
    link: str = None
):
    """Wrapper for create_notification."""
    return create_notification(db, user_id, title, message, type, link)
