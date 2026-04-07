from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.requisition import Requisition
from app.models.application import Application, ApplicationStatus
from app.models.candidate import Candidate
from app.models.contact import ContactRequest
from app.routers.auth import require_role
from app.services.google_service import send_gmail
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["Super Admin"])


@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin))
):
    total_companies = db.query(User.company_name).filter(User.status == UserStatus.approved).distinct().count()
    total_candidates = db.query(Candidate).count()
    total_hms = db.query(User).filter(User.role == UserRole.hiring_manager, User.status == UserStatus.approved).count()
    total_rms = db.query(User).filter(User.role == UserRole.resource_manager, User.status == UserStatus.approved).count()
    total_requests = db.query(Requisition).count()

    hm_analytics = []
    for hm in db.query(User).filter(User.role == UserRole.hiring_manager, User.status == UserStatus.approved).all():
        req_count = db.query(Requisition).filter(Requisition.created_by == hm.id).count()
        applied_count = db.query(Application).join(Requisition).filter(Requisition.created_by == hm.id).count()
        shortlisted_count = db.query(Application).join(Requisition).filter(
            Requisition.created_by == hm.id,
            Application.status == ApplicationStatus.internal_shortlist
        ).count()
        hm_analytics.append({
            "id": hm.id, "name": hm.full_name, "email": hm.email,
            "company": hm.company_name, "department": hm.department,
            "status": hm.status.value if hm.status else "approved",
            "requests_raised": req_count, "total_applicants": applied_count, "shortlisted": shortlisted_count
        })

    rm_analytics = []
    for rm in db.query(User).filter(User.role == UserRole.resource_manager, User.status == UserStatus.approved).all():
        pipeline_size = db.query(Application).count()
        review_count = db.query(Application).filter(Application.status == ApplicationStatus.screening).count()
        rm_analytics.append({
            "id": rm.id, "name": rm.full_name, "email": rm.email,
            "company": rm.company_name, "department": rm.department,
            "status": rm.status.value if rm.status else "approved",
            "pipeline_size": pipeline_size, "under_review": review_count
        })

    companies = []
    for (cname,) in db.query(User.company_name).filter(User.company_name.isnot(None), User.status == UserStatus.approved).distinct().all():
        hms_in_co = db.query(User).filter(User.company_name == cname, User.role == UserRole.hiring_manager, User.status == UserStatus.approved).count()
        rms_in_co = db.query(User).filter(User.company_name == cname, User.role == UserRole.resource_manager, User.status == UserStatus.approved).count()
        companies.append({"name": cname, "hms_count": hms_in_co, "rms_count": rms_in_co})

    return {
        "stats": {
            "companies": total_companies, "candidates": total_candidates,
            "hms": total_hms, "rms": total_rms, "requests": total_requests
        },
        "hm_analytics": hm_analytics,
        "rm_analytics": rm_analytics,
        "companies_overview": companies
    }


@router.delete("/remove-user/{user_id}")
def remove_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin))
):
    """Permanently remove a HM or RM. They must re-register to regain access."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Cannot remove Super Admin account")
    if user.role == UserRole.candidate:
        raise HTTPException(status_code=403, detail="Use candidate management to remove candidates")

    name, email, role = user.full_name, user.email, user.role.value

    # Manually delete dependents that lack ON DELETE CASCADE before deleting user
    db.execute(text("DELETE FROM notifications WHERE user_id = :uid"), {"uid": user_id})
    db.execute(text("DELETE FROM user_settings WHERE user_id = :uid"), {"uid": user_id})
    
    # Handle Requisitions (and their applications due to cascade delete in model, but we'll use SQL)
    # First delete applications linked to those requisitions
    db.execute(text("""
        DELETE FROM applications 
        WHERE requisition_id IN (SELECT id FROM requisitions WHERE created_by = :uid OR assigned_hm_id = :uid)
    """), {"uid": user_id})
    
    # Then delete the requisitions
    db.execute(text("DELETE FROM requisitions WHERE created_by = :uid OR assigned_hm_id = :uid"), {"uid": user_id})

    # Detach ORM object then delete via raw SQL
    db.expunge(user)
    db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})
    db.commit()

    return {
        "message": f"'{name}' ({email}) has been permanently removed.",
        "removed": {"id": user_id, "name": name, "email": email, "role": role}
    }


@router.delete("/remove-company/{company_name}")
def remove_company(
    company_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin))
):
    """Permanently remove all HMs and RMs from a company."""
    users = db.query(User).filter(
        User.company_name == company_name,
        User.role.in_([UserRole.hiring_manager, UserRole.resource_manager])
    ).all()

    if not users:
        raise HTTPException(status_code=404, detail=f"No recruiters found for '{company_name}'")

    removed_users = [{"id": u.id, "name": u.full_name, "email": u.email, "role": u.role.value} for u in users]
    user_ids = [u.id for u in users]
    count = len(users)

    # Delete dependents without ON DELETE CASCADE, then delete users
    for uid in user_ids:
        db.execute(text("DELETE FROM notifications WHERE user_id = :uid"), {"uid": uid})
        db.execute(text("DELETE FROM user_settings WHERE user_id = :uid"), {"uid": uid})
        
        # Handle Requisitions + Applications
        db.execute(text("""
            DELETE FROM applications 
            WHERE requisition_id IN (SELECT id FROM requisitions WHERE created_by = :uid OR assigned_hm_id = :uid)
        """), {"uid": uid})
        db.execute(text("DELETE FROM requisitions WHERE created_by = :uid OR assigned_hm_id = :uid"), {"uid": uid})

    for u in users:
        db.expunge(u)
    db.execute(text("DELETE FROM users WHERE id = ANY(:ids)"), {"ids": user_ids})
    db.commit()

    return {
        "message": f"All {count} recruiter(s) from '{company_name}' permanently removed.",
        "removed_count": count,
        "removed_users": removed_users
    }


@router.get("/all-recruiters")
def get_all_recruiters(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin))
):
    """All approved HMs and RMs for the Users management tab."""
    recruiters = db.query(User).filter(
        User.role.in_([UserRole.hiring_manager, UserRole.resource_manager]),
        User.status == UserStatus.approved
    ).all()
    return [
        {
            "id": u.id, "name": u.full_name, "email": u.email,
            "role": u.role.value, "company": u.company_name,
            "department": u.department, "status": u.status.value,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in recruiters
    ]

@router.get("/contact-requests")
def get_contact_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin))
):
    """List all contact inquiries from the landing page."""
    requests = db.query(ContactRequest).order_by(ContactRequest.created_at.desc()).all()
    return [{
        "id": r.id,
        "email": r.email,
        "message": r.message,
        "status": r.status,
        "created_at": r.created_at
    } for r in requests]

class ReplyPayload(BaseModel):
    message: str

@router.post("/contact-requests/{request_id}/reply")
def reply_to_contact_request(
    request_id: int,
    payload: ReplyPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin))
):
    """Reply to a contact inquiry via email using the admin's Gmail connection."""
    contact_req = db.query(ContactRequest).filter(ContactRequest.id == request_id).first()
    if not contact_req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # 1. Use Super Admin's Gmail to send response
    if not current_user.google_refresh_token:
        raise HTTPException(status_code=400, detail="You must connect your Google account to send replies.")
        
    subject = f"Re: Your inquiry on HireStream | Response from Admin"
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 600px; padding: 20px;">
        <h2 style="color: #3b82f6;">Response from HireStream Support</h2>
        <p>Dear {contact_req.email},</p>
        <div style="background: #fdfdfd; border-radius: 8px; border: 1px solid #eee; padding: 20px; font-size: 15px; margin: 20px 0;">
            {payload.message}
        </div>
        <p>Best Regards,<br/><strong>HireStream Team</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <div style="color: #999; font-size: 12px;">
            Original Inquiry:<br/>
            <blockquote style="border-left: 2px solid #ddd; padding-left: 10px; margin-left: 0; font-style: italic;">
                {contact_req.message}
            </blockquote>
        </div>
    </div>
    """
    
    try:
        send_gmail(
            access_token=current_user.google_access_token,
            refresh_token=current_user.google_refresh_token,
            to=contact_req.email,
            subject=subject,
            html_body=html_body
        )
        # Update status
        contact_req.status = "responded"
        db.commit()
        return {"message": "Reply sent successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@router.delete("/contact-requests/{request_id}")
def delete_contact_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin))
):
    """Permanently delete a contact inquiry."""
    contact_req = db.query(ContactRequest).filter(ContactRequest.id == request_id).first()
    if not contact_req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    db.delete(contact_req)
    db.commit()
    return {"message": "Inquiry deleted successfully"}
