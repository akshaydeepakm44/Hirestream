from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.routers.auth import require_role
from app.services.google_service import send_gmail
from typing import List, Optional
import json

router = APIRouter(prefix="/mail", tags=["Mail"])

@router.post("/send")
async def send_email(
    to: str = Form(...),
    subject: str = Form(...),
    body: str = Form(...),
    cc: Optional[str] = Form(None),  # Expecting comma separated or JSON string
    bcc: Optional[str] = Form(None),
    attachments: List[UploadFile] = File([]),
    current_user: User = Depends(require_role(UserRole.hiring_manager, UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    if not current_user.google_access_token:
        raise HTTPException(status_code=400, detail="Google account not connected")
    
    # Process CC/BCC
    cc_list = []
    if cc:
        try:
            cc_list = json.loads(cc) if cc.startswith('[') else [x.strip() for x in cc.split(',')]
        except:
            cc_list = [cc.strip()]
            
    bcc_list = []
    if bcc:
        try:
            bcc_list = json.loads(bcc) if bcc.startswith('[') else [x.strip() for x in bcc.split(',')]
        except:
            bcc_list = [bcc.strip()]

    # Process Attachments
    attachment_data = []
    for att in attachments:
        content = await att.read()
        attachment_data.append({
            "name": att.filename,
            "content": content
        })

    try:
        send_gmail(
            access_token=current_user.google_access_token,
            refresh_token=current_user.google_refresh_token,
            to=to,
            subject=subject,
            html_body=body,
            cc=cc_list,
            bcc=bcc_list,
            attachments=attachment_data
        )
        
        # Trigger Notifications
        try:
            from app.models.notification import Notification
            # Notify the sender (Self) - although normally they know, but for "Activity" bell tracking it's helpful
            db.add(Notification(
                user_id=current_user.id,
                title="Email Sent",
                message=f"Email sent to {to}: {subject}",
                type="email"
            ))
            
            # Notify other Resource Managers for transparency
            rms = db.query(User).filter(User.role == UserRole.resource_manager).all()
            for rm in rms:
                if rm.id != current_user.id:
                    db.add(Notification(
                        user_id=rm.id,
                        title="Candidate Email Tip",
                        message=f"{current_user.full_name} sent an email to {to}: {subject}",
                        type="email"
                    ))
            db.commit()
        except:
             pass

        return {"message": "Email sent successfully"}
    except Exception as e:
        print(f"MAIL ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
