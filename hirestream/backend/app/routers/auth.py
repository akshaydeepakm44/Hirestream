from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta
import uuid
from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.candidate import Candidate
from app.schemas.user import LoginRequest, Token, UserCreate, UserResponse, UserApproveRequest
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token
from app.core.config import settings
from app.services.notification_service import create_notification
from app.services.google_service import send_gmail

print("\n[BACKEND LOG] Auth router initialized. Roles allowed: HM, RM, Candidate, SA. 'Recruiter' removed.\n")

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_role(*roles: UserRole):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Search for user with both email AND the requested role
    user = db.query(User).filter(
        User.email.ilike(request.email),
        User.role == request.role
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=404, 
            detail=f"No account found for {request.email} with role {request.role}. Please register first."
        )
        
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Block pending/rejected recruiters
    if user.role in [UserRole.hiring_manager, UserRole.resource_manager]:
        if user.status == UserStatus.pending:
            raise HTTPException(status_code=403, detail="Your account is pending approval by the Super Admin.")
        elif user.status == UserStatus.rejected:
            raise HTTPException(status_code=403, detail="Your registration request was rejected. Contact your company admin.")

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    print(f"\n[REGISTRATION DEBUG]")
    print(f"Target Email: {user_in.email}")
    print(f"Requested Role: '{user_in.role}' (type: {type(user_in.role)})")
    
    # List all profiles to see exactly what role values are stored in DB
    all_profiles = db.query(User).filter(User.email.ilike(user_in.email)).all()
    print(f"Existing profiles for {user_in.email}: {len(all_profiles)}")
    for p in all_profiles:
        print(f"- Found record: ID={p.id}, Role='{p.role}' (type: {type(p.role)}), Value: {p.role.value if hasattr(p.role, 'value') else p.role}")
    
    existing = db.query(User).filter(
        User.email.ilike(user_in.email),
        User.role == user_in.role
    ).first()
    
    if existing:
        print(f"DEBUG: Found existing profile for {user_in.email} as {user_in.role.value}. UPDATING instead of blocking.")
        # Update existing record with new details
        existing.full_name = user_in.full_name
        existing.hashed_password = get_password_hash(user_in.password)
        # Re-set status to pending for organizational roles to trigger re-approval if they want to change company/etc
        if user_in.role in [UserRole.hiring_manager, UserRole.resource_manager]:
            existing.status = UserStatus.pending
            existing.company_name = user_in.company_name
            existing.department = user_in.department
            existing.job_title = user_in.job_title
            existing.location = user_in.location
            existing.specialization = user_in.specialization
        
        db.commit()
        db.refresh(existing)
        return existing
    
    print(f"SUCCESS: No matching role Profile found. Continuing with fresh registration...")
    
    hashed = get_password_hash(user_in.password)
    
    # Set status based on role
    # Candidates and Super Admins (if ever using register endpoint) are auto-approved
    initial_status = UserStatus.approved
    if user_in.role in [UserRole.hiring_manager, UserRole.resource_manager]:
        initial_status = UserStatus.pending
        
    user = User(
        email=user_in.email, 
        full_name=user_in.full_name, 
        hashed_password=hashed, 
        role=user_in.role,
        status=initial_status,
        company_name=user_in.company_name,
        department=user_in.department,
        job_title=user_in.job_title,
        location=user_in.location,
        specialization=user_in.specialization
    )
    
    try:
        db.add(user)
        db.flush()
        
        if user_in.role == UserRole.candidate:
            candidate = Candidate(user_id=user.id)
            db.add(candidate)
            
        # Notify SA if registration requires approval
        if initial_status == UserStatus.pending:
            sa = db.query(User).filter(User.role == UserRole.super_admin).first()
            if sa:
                create_notification(
                    db, sa.id, "New Registration Request",
                    f"{user.full_name} ({user.role.value}) from {user.company_name} requested access.",
                    "approval"
                )
                # Attempt to send email to SA if they have tokens
                if sa.google_access_token:
                    try:
                        send_gmail(
                            sa.google_access_token, sa.google_refresh_token,
                            to=sa.email, subject="New Registration Request",
                            html_body=f"<h3>New Registration</h3><p><b>Name:</b> {user.full_name}</p><p><b>Email:</b> {user.email}</p><p><b>Company:</b> {user.company_name}</p><p><b>Role:</b> {user.role.value}</p><p>Please log in to the Super Admin dashboard to approve or reject this request.</p>"
                        )
                    except: pass
            
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        print(f"CRITICAL ERROR in registration for {user_in.email}: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
        
    return user

@router.post("/approve-request")
def approve_request(
    req: UserApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin))
):
    target_user = db.query(User).filter(User.id == req.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    old_status = target_user.status
    target_user.status = UserStatus.approved if req.approve else UserStatus.rejected
    db.commit()
    
    # Send email to user (using SA's gmail service)
    if current_user.google_access_token:
        try:
            subject = "Account Approved" if req.approve else "Account Registration Status"
            body = f"Hello {target_user.full_name},<br><br>"
            if req.approve:
                body += "Your registration has been approved. You can now log in to the HireStream platform."
            else:
                body += "Your registration request was rejected. Please contact your company administrator for more information."
            
            send_gmail(
                current_user.google_access_token, current_user.google_refresh_token,
                to=target_user.email, subject=subject, html_body=body
            )
        except: pass
        
    return {"message": f"User {target_user.email} {'approved' if req.approve else 'rejected'}"}

@router.get("/pending-requests", response_model=list[UserResponse])
def list_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin))
):
    return db.query(User).filter(User.status == UserStatus.pending).all()

# --- Rest of the existing methods ---

from pydantic import BaseModel
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
def change_password(request: ChangePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    current_user.hashed_password = get_password_hash(request.new_password)
    db.commit()
    return {"message": "Password changed successfully"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.delete("/account")
def delete_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.delete(current_user)
    db.commit()
    return {"message": "Account permanently deactivated"}

@router.get("/google/login")
def google_login(request: Request, role: str = "candidate"):
    from app.services.google_service import get_google_auth_url
    from fastapi.responses import RedirectResponse
    
    # 1. Determine Backend Redirect URI (for Google Console)
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.url.netloc)
    redirect_uri = f"{scheme}://{host}/auth/google/callback"
    
    # 2. Determine Frontend URL (where we eventually return)
    # Priority: Referer header (origin only) > FRONTEND_URL setting
    referer = request.headers.get("referer")
    if referer:
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        frontend_url = f"{parsed.scheme}://{parsed.netloc}"
    else:
        frontend_url = settings.FRONTEND_URL.rstrip('/')
    
    print("\n" + "="*50)
    print("GOOGLE SSO DEBUG")
    print(f"Backend Redirect URI: {redirect_uri}")
    print(f"Frontend Target: {frontend_url}")
    print("="*50 + "\n")
    
    # Encode origin in state so we can return to the correct frontend after Google
    # Format: role|origin (e.g. resource_manager|http://localhost:5173)
    state = f"{role}|{frontend_url}"
    
    url = get_google_auth_url(redirect_uri=redirect_uri, state=state)
    return RedirectResponse(url)

@router.get("/google/callback")
async def google_callback(request: Request, code: str | None = None, state: str | None = "candidate", error: str | None = None, db: Session = Depends(get_db)):
    import traceback
    try:
        from fastapi.responses import RedirectResponse
        
        # Decode state (role|origin)
        role_state = "candidate"
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        if state and "|" in state:
            role_state, frontend_url = state.split("|", 1)
            frontend_url = frontend_url.rstrip('/')
        else:
            role_state = state or "candidate"
        
        # Ensure we use the correct redirect_uri for token exchange
        scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
        host = request.headers.get("x-forwarded-host", request.url.netloc)
        redirect_uri = f"{scheme}://{host}/auth/google/callback"
        
        if error: return RedirectResponse(f"{frontend_url}/?error=google_failed")
        if not code: return RedirectResponse(f"{frontend_url}/?error=missing_code")
        
        from app.services.google_service import get_google_tokens
        try:
            data = await get_google_tokens(code, redirect_uri=redirect_uri)
        except Exception as e:
            print(f"Google Token Exchange Exception: {e}")
            return RedirectResponse(f"{frontend_url}/?error=token_exchange_failed")
            
        profile = data['profile']; tokens = data['tokens']
        email = (profile.get("email") or "").lower(); google_id = profile.get("sub"); name = profile.get("name"); picture = profile.get("picture")
        if not email: return RedirectResponse(f"{frontend_url}/?error=no_email_provided")
        
        # SEARCH BY EMAIL AND ROLE for multi-role support
        user = db.query(User).filter(
            User.email.ilike(email),
            User.role == role_state
        ).first()
        
        try:
            if not user:
                # Account not found - Enforce 'Register First' policy
                print(f"DEBUG: No account found for {email} with role {role_state} during SSO.")
                role_path = "/login"
                if role_state == "hiring_manager": role_path = "/hiring/login"
                elif role_state == "resource_manager": role_path = "/resource/login"
                
                return RedirectResponse(f"{frontend_url}{role_path}?error=user_not_found&email={email}")
            else:
                # User exists with this email and role.
                print(f"DEBUG: SSO Success. Found user {user.id} with role {user.role}")
                
                # Check approval status for all non-candidate roles (HM, RM)
                if user.role in [UserRole.hiring_manager, UserRole.resource_manager]:
                    role_error_pages = {
                        UserRole.hiring_manager: "/hiring/login",
                        UserRole.resource_manager: "/resource/login"
                    }
                    error_path = role_error_pages.get(user.role, "/login")
                    
                    if user.status == UserStatus.pending:
                        return RedirectResponse(f"{frontend_url}{error_path}?error=pending_approval")
                    elif user.status == UserStatus.rejected:
                        return RedirectResponse(f"{frontend_url}{error_path}?error=rejected_access")

                # Sync Google details and login
                user.google_id = google_id
                if picture: user.profile_picture = picture
                if tokens.get("access_token"): user.google_access_token = tokens.get("access_token")
                if tokens.get("refresh_token"): user.google_refresh_token = tokens.get("refresh_token")
                
            db.commit(); db.refresh(user)
        except Exception as e:
            db.rollback(); print(f"DB Sync failed: {e}")
            return RedirectResponse(f"{frontend_url}/?error=database_error")
            
        role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
        token = create_access_token({"sub": str(user.id), "role": role_val})
        print(f"DEBUG: Issued token for role {role_val}")
        return RedirectResponse(f"{frontend_url}/?token={token}")
    except Exception as e:
        print(f"Callback error: {traceback.format_exc()}")
        return RedirectResponse(f"{settings.FRONTEND_URL}/?error=internal_server_error")

class ForgotPasswordRequest(BaseModel):
    email: str
class VerifyOTPRequest(BaseModel):
    email: str; otp: str; new_password: str

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email.ilike(req.email)).first()
    if not user: raise HTTPException(status_code=404, detail="Email not signed up")
    from app.services.otp_service import generate_otp, send_otp_email
    otp_code = generate_otp(db, user.email)
    send_otp_email(user.email, otp_code)
    return {"message": "OTP sent to email"}

@router.post("/verify-otp")
def verify_otp_endpoint(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    from app.services.otp_service import verify_otp
    is_valid = verify_otp(db, req.email, req.otp)
    if not is_valid: raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Update passwords for ALL user records with this email (multi-role support)
    users = db.query(User).filter(User.email.ilike(req.email)).all()
    if users:
        hashed_password = get_password_hash(req.new_password)
        for user in users:
            user.hashed_password = hashed_password
        db.commit()
        return {"message": f"Password updated successfully for {len(users)} role profile(s)."}
    raise HTTPException(status_code=404, detail="User accounts not found")
