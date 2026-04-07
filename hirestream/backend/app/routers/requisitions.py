from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.requisition import Requisition, RequisitionStatus
from app.models.application import Application
from app.schemas.requisition import RequisitionCreate, RequisitionUpdate, RequisitionResponse
from app.routers.auth import get_current_user, require_role

router = APIRouter(prefix="/requisitions", tags=["Requisitions"])

def build_req_response(req: Requisition, db: Session) -> RequisitionResponse:
    count = db.query(Application).filter(Application.requisition_id == req.id).count()
    r = RequisitionResponse.from_orm(req)
    r.applicant_count = count
    return r

@router.post("", response_model=RequisitionResponse)
def create_requisition(
    data: RequisitionCreate,
    current_user: User = Depends(require_role(UserRole.hiring_manager, UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    req = Requisition(
        title=data.title,
        role=data.role,
        department=data.department,
        location=data.location,
        required_skills=data.required_skills,
        job_description=data.job_description,
        created_by=current_user.id,
        assigned_hm_id=data.assigned_hm_id,
        company_name=current_user.company_name
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Trigger Notifications
    try:
        from app.models.notification import Notification
        # Notify Resource Managers (They oversee all requisitions)
        rms = db.query(User).filter(User.role == UserRole.resource_manager).all()
        for rm in rms:
            if rm.id != current_user.id:
                db.add(Notification(
                    user_id=rm.id,
                    title="New Hire Request",
                    message=f"New requisition created for {req.title} in {req.department}.",
                    type="requisition"
                ))
        
        # Notify Assigned HM if they weren't the one who created it
        if req.assigned_hm_id and req.assigned_hm_id != current_user.id:
            db.add(Notification(
                user_id=req.assigned_hm_id,
                title="Requisition Assigned",
                message=f"You have been assigned as the Hiring Manager for {req.title}.",
                type="requisition"
            ))
        db.commit()
    except Exception as e:
        print(f"NOTIFICATION ERROR: {e}")

    return build_req_response(req, db)

@router.get("", response_model=List[RequisitionResponse])
def list_requisitions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = None
):
    q = db.query(Requisition).filter(Requisition.is_active == True)
    if current_user.role == UserRole.hiring_manager:
        q = q.filter(Requisition.assigned_hm_id == current_user.id)
    if status:
        q = q.filter(Requisition.status == status)
    reqs = q.order_by(Requisition.created_at.desc()).all()
    return [build_req_response(r, db) for r in reqs]

@router.get("/{req_id}", response_model=RequisitionResponse)
def get_requisition(req_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    req = db.query(Requisition).filter(Requisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    return build_req_response(req, db)

@router.put("/{req_id}", response_model=RequisitionResponse)
def update_requisition(
    req_id: int,
    data: RequisitionUpdate,
    current_user: User = Depends(require_role(UserRole.hiring_manager, UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    req = db.query(Requisition).filter(Requisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(req, field, value)
    db.commit()
    db.refresh(req)
    return build_req_response(req, db)

@router.delete("/{req_id}")
def delete_requisition(
    req_id: int,
    current_user: User = Depends(require_role(UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    req = db.query(Requisition).filter(Requisition.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    req.is_active = False
    db.commit()
    return {"message": "Requisition closed"}
