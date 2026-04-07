from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.candidate import Candidate
from app.schemas.candidate import CandidateCreate, CandidateUpdate, CandidateResponse, CandidateWithUser
from app.schemas.user import UserResponse
from app.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/me/profile", response_model=CandidateWithUser)
def get_my_profile(current_user: User = Depends(require_role(UserRole.candidate)), db: Session = Depends(get_db)):
    profile = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    result = CandidateWithUser.from_orm(profile)
    result.full_name = current_user.full_name
    result.email = current_user.email
    return result

@router.put("/me/profile", response_model=CandidateResponse)
def update_my_profile(
    data: CandidateUpdate,
    current_user: User = Depends(require_role(UserRole.candidate)),
    db: Session = Depends(get_db)
):
    profile = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not profile:
        profile = Candidate(user_id=current_user.id)
        db.add(profile)
    for field, value in data.dict(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/hiring-managers", response_model=list[UserResponse])
def list_hiring_managers(
    current_user: User = Depends(require_role(UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    return db.query(User).filter(User.role == UserRole.hiring_manager).all()

@router.get("/search-staff")
def search_staff(
    q: str = "",
    current_user: User = Depends(require_role(UserRole.hiring_manager, UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    """Search HMs and RMs by name or email for adding as meeting participants."""
    query = db.query(User).filter(
        User.role.in_([UserRole.hiring_manager, UserRole.resource_manager]),
        User.is_active == True
    )
    if q:
        query = query.filter(
            (User.full_name.ilike(f"%{q}%")) | (User.email.ilike(f"%{q}%"))
        )
    users = query.limit(10).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.value
        }
        for u in users
        if u.id != current_user.id  # Exclude the scheduler themselves
    ]
