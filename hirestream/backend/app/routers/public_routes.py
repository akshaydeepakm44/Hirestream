from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.requisition import Requisition, RequisitionStatus
from app.models.contact import ContactRequest
from app.models.user import User, UserRole
from app.services.google_service import send_gmail
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/public", tags=["Public Routes"])

class ContactMessage(BaseModel):
    email: EmailStr
    message: str

@router.get("/jobs")
def get_public_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Requisition).filter(
        Requisition.is_active == True,
        Requisition.status == RequisitionStatus.open
    ).all()
    
    return [{
        "id": j.id,
        "title": j.title,
        "department": j.department,
        "location": j.location,
        "required_skills": j.required_skills,
        "experience_level": getattr(j, 'experience_required', None),
        "job_description": j.job_description,
        "employment_type": getattr(j, 'employment_type', "Full-Time"),
        "company_name": j.company_name or (j.creator.company_name if j.creator else "HireStream"),
    } for j in jobs]

@router.get("/jobs/{job_id}")
def get_public_job(job_id: int, db: Session = Depends(get_db)):
    j = db.query(Requisition).filter(
        Requisition.id == job_id,
        Requisition.is_active == True,
        Requisition.status == RequisitionStatus.open
    ).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return {
        "id": j.id,
        "title": j.title or j.role,
        "department": j.department,
        "location": j.location,
        "required_skills": j.required_skills,
        "experience_required": j.experience_required,
        "job_description": j.job_description,
        "employment_type": j.employment_type or "Full-Time",
        "openings": j.openings,
        "created_at": j.created_at,
        "status": j.status,
        "hiring_manager": j.assigned_hm.full_name if j.assigned_hm else "Not Assigned",
        "resource_manager": j.creator.full_name if j.creator else "System",
        "company_name": j.company_name or (j.creator.company_name if j.creator else "HireStream"),
        "applicants_count": len(j.applications) if j.applications else 0,
        "roles_responsibilities": j.roles_responsibilities,
        "nice_to_have_skills": j.nice_to_have_skills,
        "urgency": j.urgency,
        "target_joining_date": j.target_joining_date,
    }

@router.post("/contact")
async def public_contact_admin(payload: ContactMessage, db: Session = Depends(get_db)):
    # 1. Save to Database
    new_request = ContactRequest(
        email=payload.email,
        message=payload.message
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
        # 2. Try to notify Super Admin via email
    try:
        admin = db.query(User).filter(User.role == UserRole.super_admin).first()
        backup_email = "akshay@alphanome.ai"
        
        subject = f"New Contact Request from {payload.email} | HireStream"
        html_body = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">New Contact Form Submission</h2>
            <p style="font-size: 16px;"><strong>From:</strong> <a href="mailto:{payload.email}">{payload.email}</a></p>
            <p style="font-size: 16px;"><strong>Message:</strong></p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 4px solid #3b82f6; font-size: 15px; line-height: 1.6;">
                {payload.message}
            </div>
            <p style="color: #888; font-size: 12px; margin-top: 20px;">
                This message was sent via the HireStream landing page contact form. 
                You can reply directly to the sender by clicking their email above.
            </p>
        </div>
        """
        
        # We need tokens to send via Gmail. Use the super admin's tokens if available.
        # Otherwise, skip email but keep it in DB.
        if admin and admin.google_refresh_token:
            # Send to Super Admin
            send_gmail(
                access_token=admin.google_access_token,
                refresh_token=admin.google_refresh_token,
                to=admin.email,
                subject=subject,
                html_body=html_body,
                cc=[backup_email] # Also send to system backup
            )
        else:
            # If no tokens, at least log it or try a different method if available.
            # For now, let's just log it.
            print(f"CANNOT SEND EMAIL: Super Admin has no Google Connection. Backup email: {backup_email}")
            
    except Exception as e:
        # We don't want to fail the request if email fails
        print(f"FAILED TO SEND CONTACT EMAIL: {str(e)}")
        
    return {"message": "Your message has been sent successfully. We will get back to you soon!"}
