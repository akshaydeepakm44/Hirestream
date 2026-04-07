import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole, UserStatus
from app.core.security import get_password_hash

def reset_admin():
    db = SessionLocal()
    try:
        email = "dm4516718@gmail.com"
        password = "12345678"
        
        # 1. DELETE ANY OLD SUPER ADMINS (Keep database clean as requested)
        db.query(User).filter(User.role == UserRole.super_admin).delete()
        
        # 2. CREATE NEW SUPER ADMIN
        sa = User(
            email=email,
            full_name="Super Admin",
            hashed_password=get_password_hash(password),
            role=UserRole.super_admin,
            status=UserStatus.approved,
            is_active=True
        )
        db.add(sa)
        db.commit()
        print(f"SUCCESS: Super Admin account created/updated!")
        print(f"Email: {email}")
        print(f"Password: {password}")
        print(f"Role: super_admin")
    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin()
