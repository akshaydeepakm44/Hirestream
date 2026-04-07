from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User, UserRole
from app.models.interview import Interview, InterviewStatus
from app.models.application import Application
from app.models.candidate import Candidate
from app.models.requisition import Requisition
from app.schemas.interview import InterviewCreate, InterviewUpdate, InterviewResponse, InterviewReview
from app.routers.auth import get_current_user, require_role
from datetime import datetime, timezone, timedelta
import pytz
from dateutil import parser

router = APIRouter(prefix="/interviews", tags=["Interviews"])

def build_interview_response(interview: Interview, db: Session) -> InterviewResponse:
    app = db.query(Application).filter(Application.id == interview.application_id).first()
    candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first() if app else None
    user = candidate.user if candidate else None
    req = db.query(Requisition).filter(Requisition.id == app.requisition_id).first() if app else None
    return InterviewResponse(
        id=interview.id,
        application_id=interview.application_id,
        scheduled_by=interview.scheduled_by,
        scheduled_at=interview.scheduled_at,
        mode=interview.mode,
        status=interview.status,
        location_or_link=interview.location_or_link,
        notes=interview.notes,
        duration_minutes=interview.duration_minutes,
        end_time=interview.end_time,
        rating=interview.rating,
        feedback=interview.feedback,
        created_at=interview.created_at,
        candidate_name=user.full_name if user else None,
        candidate_email=user.email if user else None,
        requisition_title=req.title if req else None,
        requisition_role=req.role if req else None,
        meeting_link=interview.meeting_link,
        calendar_event_id=interview.calendar_event_id,
        participants=interview.participants if interview.participants else "",
        scheduled_role=interview.scheduled_role
    )

@router.post("", response_model=InterviewResponse)
def schedule_interview(
    data: InterviewCreate,
    current_user: User = Depends(require_role(UserRole.hiring_manager, UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == data.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    # Pre-process scheduled_at to ensure it's UTC and naive for DB storage
    # If Pydantic parsed it from an ISO string, it might have tzinfo.
    # We strictly enforce UTC for the database column.
    if data.scheduled_at.tzinfo:
        utc_dt = data.scheduled_at.astimezone(timezone.utc).replace(tzinfo=None)
    else:
        # If naive, treat as UTC (assuming frontend sent UTC)
        utc_dt = data.scheduled_at
        
    duration = data.duration_minutes or 30
    interview = Interview(
        application_id=data.application_id,
        scheduled_by=current_user.id,
        scheduled_at=utc_dt,
        mode=data.mode,
        location_or_link=data.location_or_link,
        notes=data.notes,
        duration_minutes=duration,
        end_time=utc_dt + timedelta(minutes=duration),
        participants=",".join(data.participants) if data.participants else None,
        scheduled_role=current_user.role
    )
    
    # Google Meet Integration
    if not current_user.google_access_token or not current_user.google_refresh_token:
        raise HTTPException(
            status_code=403, 
            detail="Google account connection required to schedule meetings and send automated notifications. Please connect your Google account in settings."
        )

    try:
        from app.services.google_service import create_google_meet
        # Use relationship for cleaner access
        candidate_user = app.candidate.user if app.candidate else None
        
        if candidate_user:
            # Clean and deduplicate participants
            provided_participants = data.participants or []
            clean_participants = list(set([p.strip() for p in provided_participants if p.strip()]))
            
            # DIAGNOSTIC LOGS
            print(f"DEBUG: STARTING GOOGLE CALENDAR SYNC")
            print(f"DEBUG: Candidate Email: {candidate_user.email}")
            print(f"DEBUG: Participants List: {clean_participants}")
            print(f"DEBUG: Organizer (Current User): {current_user.email}")
            
            meet_data = create_google_meet(
                access_token=current_user.google_access_token,
                refresh_token=current_user.google_refresh_token,
                candidate_email=candidate_user.email,
                start_time=utc_dt, # Uses verified UTC datetime
                duration_minutes=duration,
                title=f"Interview: {candidate_user.full_name} for {app.requisition.title if app.requisition else 'Role'}",
                description=data.notes or "Technical Interview",
                participants=clean_participants,
                organizer_email=current_user.email
            )
            interview.meeting_link = meet_data.get("meet_link")
            interview.calendar_event_id = meet_data.get("event_id")
            if not interview.location_or_link:
                interview.location_or_link = interview.meeting_link
            print(f"DEBUG: SUCCESS - EventID {interview.calendar_event_id}, MeetLink {interview.meeting_link}")
        else:
            print("DEBUG: SKIPPING CALENDAR SYNC - No Candidate User record found.")
    except Exception as e:
        print(f"!!! GOOGLE CALENDAR SYNC FAILED: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Google Calendar integration failed: {str(e)}")
    db.add(interview)
    db.commit()
    db.refresh(interview)

    # Use the interview data to send professional Gmail notifications (redundancy layer)
    try:
        if current_user.google_access_token and current_user.google_refresh_token:
            from app.services.google_service import send_gmail
            
            # 1. Fetch Candidate and Context
            candidate_user = app.candidate.user if app.candidate else None
            role_title = app.requisition.title if app.requisition else "Open Role"
            time_str = data.scheduled_at.strftime('%d %B %I:%M %p')
            meet_link = interview.meeting_link
            
            common_style = """font-family: 'Inter', -apple-system, sans-serif; padding: 25px; border: 1px solid #e1e7ef; border-radius: 20px; max-width: 600px; color: #1e293b; line-height: 1.6;"""
            header_style = """margin-top: 0; color: #0f172a; font-weight: 800; font-size: 24px; letter-spacing: -0.025em;"""
            box_style = """background: #f8fafc; padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid #f1f5f9;"""
            link_style = """display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 700; text-decoration: none; margin-top: 10px;"""

            # 1. Notify Candidate
            if candidate_user:
                try:
                    candidate_html = f"""
                    <div style="{common_style}">
                        <h2 style="{header_style}">Interview Scheduled</h2>
                        <p>Hello <strong>{candidate_user.full_name}</strong>,</p>
                        <p>Your interview for the position <strong>{role_title}</strong> is confirmed. We're excited to learn more about your background!</p>
                        <div style="{box_style}">
                            <p style="margin: 5px 0;"><strong>Date & Time:</strong> {time_str} (IST Support)</p>
                            {f'<a href="{meet_link}" style="{link_style}">Join Google Meet</a>' if meet_link else ""}
                        </div>
                        <p style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 25px;">Secured by HireStream Talent Engine</p>
                    </div>
                    """
                    send_gmail(
                        access_token=current_user.google_access_token,
                        refresh_token=current_user.google_refresh_token,
                        to=candidate_user.email,
                        subject=f"Interview Confirmed: {role_title}",
                        html_body=candidate_html
                    )
                    print(f"DEBUG: Gmail sent to Candidate: {candidate_user.email}")
                except Exception as e:
                    print(f"DEBUG: Failed to send Gmail to Candidate: {e}")

            # 2. Notify Tagged Participants
            if data.participants:
                unique_p = list(set([p.strip() for p in data.participants if p.strip()]))
                for pEmail in unique_p:
                    if pEmail.lower() == current_user.email.lower(): continue
                    try:
                        panel_html = f"""
                        <div style="{common_style}">
                            <h2 style="{header_style}">Panel Assignment</h2>
                            <p>You have been tagged as an interviewer for <strong>{candidate_user.full_name if candidate_user else 'a candidate'}</strong>'s application for <strong>{role_title}</strong>.</p>
                            <div style="{box_style}">
                                <p style="margin: 5px 0;"><strong>Candidate:</strong> {candidate_user.full_name if candidate_user else 'N/A'}</p>
                                <p style="margin: 5px 0;"><strong>When:</strong> {time_str}</p>
                                {f'<a href="{meet_link}" style="{link_style}">Launch Video Briefing</a>' if meet_link else ""}
                            </div>
                            <p style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Please review candidate notes prior to the session.</p>
                        </div>
                        """
                        send_gmail(
                            access_token=current_user.google_access_token,
                            refresh_token=current_user.google_refresh_token,
                            to=pEmail,
                            subject=f"Panel Assigned: {candidate_user.full_name if candidate_user else 'Candidate'}",
                            html_body=panel_html
                        )
                        print(f"DEBUG: Gmail sent to Participant: {pEmail}")
                    except Exception as e:
                        print(f"DEBUG: Failed to send Gmail to Participant {pEmail}: {e}")

            # 3. Confirmation for the Organizer (Current User)
            try:
                organizer_html = f"""
                <div style="{common_style}">
                    <h2 style="{header_style}">Meeting Confirmed</h2>
                    <p>Hello <strong>{current_user.full_name}</strong>,</p>
                    <p>You have successfully scheduled an interview for <strong>{candidate_user.full_name if candidate_user else 'the candidate'}</strong>.</p>
                    <div style="{box_style}">
                        <p style="margin: 5px 0;"><strong>Role:</strong> {role_title}</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> {time_str}</p>
                        {f'<p style="margin: 5px 0;"><strong>Link:</strong> <a href="{meet_link}" style="color: #2563eb;">Join Now</a></p>' if meet_link else ""}
                    </div>
                    <p style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">Sent via HireStream RM Dashboard</p>
                </div>
                """
                send_gmail(
                    access_token=current_user.google_access_token,
                    refresh_token=current_user.google_refresh_token,
                    to=current_user.email,
                    subject=f"Scheduled: {candidate_user.full_name if candidate_user else 'Interview'}",
                    html_body=organizer_html
                )
                print(f"DEBUG: Gmail confirmation sent to Organizer: {current_user.email}")
            except Exception as e:
                print(f"DEBUG: Failed to send Organizer confirmation: {e}")
        else:
            print(f"DEBUG: Skipping Gmail sends - Current user {current_user.email} not fully connected to Google Oauth.")
    except Exception as e:
        print(f"DEBUG: GMAIL OVERLAY GLOBAL ERROR: {e}")

    # Trigger Notifications
    try:
        from app.models.notification import Notification
        candidate_user = db.query(User).join(Candidate).join(Application).filter(Application.id == data.application_id).first()
        app = db.query(Application).filter(Application.id == data.application_id).first()
        role_title = app.requisition.title if app and app.requisition else 'the role'
        time_str = data.scheduled_at.strftime('%d %B %I:%M %p')
        meet_link = interview.meeting_link or ''
        link_suffix = f" Join: {meet_link}" if meet_link else ""

        # 1. Notify Candidate
        if candidate_user:
            db.add(Notification(
                user_id=candidate_user.id,
                title="Interview Scheduled",
                message=f"Your interview for {role_title} is scheduled on {time_str}.{link_suffix}",
                type="interview",
                link="/candidate/applications"
            ))

        # 2. Notify all Resource Managers (except the scheduler)
        rms = db.query(User).filter(User.role == UserRole.resource_manager).all()
        for rm in rms:
            if rm.id != current_user.id:
                db.add(Notification(
                    user_id=rm.id,
                    title="Interview Scheduled",
                    message=f"Interview scheduled for {candidate_user.full_name if candidate_user else 'Candidate'} for {role_title} on {time_str}.",
                    type="interview",
                    link="/resource/dashboard/interviews"
                ))

        # 3. Notify Hiring Manager (if involved and not the scheduler)
        if app and app.requisition and app.requisition.assigned_hm_id and app.requisition.assigned_hm_id != current_user.id:
            db.add(Notification(
                user_id=app.requisition.assigned_hm_id,
                title="Interview Scheduled",
                message=f"New interview scheduled for your role {role_title}: {candidate_user.full_name if candidate_user else 'Candidate'} on {time_str}.",
                type="interview",
                link="/hiring/dashboard/interviews"
            ))

        # 4. Notify each tagged participant by looking up their user account
        if data.participants:
            participant_emails = [e.strip() for e in data.participants if e.strip()]
            for pEmail in participant_emails:
                participant_user = db.query(User).filter(User.email == pEmail).first()
                if participant_user and participant_user.id != current_user.id:
                    db.add(Notification(
                        user_id=participant_user.id,
                        title="You've Been Added to an Interview",
                        message=f"{current_user.full_name} has added you as a participant for the interview with {candidate_user.full_name if candidate_user else 'a candidate'} on {time_str}.{link_suffix}",
                        type="interview",
                        link="/resource/dashboard/interviews" if participant_user.role == UserRole.resource_manager else "/hiring/dashboard/interviews"
                    ))

        db.commit()
    except Exception as e:
        print(f"NOTIFICATION ERROR: {e}")

    return build_interview_response(interview, db)

@router.post("/{interview_id}/cancel", response_model=InterviewResponse)
def cancel_interview(
    interview_id: int,
    current_user: User = Depends(require_role(UserRole.resource_manager, UserRole.hiring_manager)),
    db: Session = Depends(get_db)
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Optional: Cancel from Google Calendar
    if interview.calendar_event_id and current_user.google_access_token:
        try:
            from app.services.google_service import get_google_credentials
            from googleapiclient.discovery import build
            creds = get_google_credentials(current_user.google_access_token, current_user.google_refresh_token)
            service = build("calendar", "v3", credentials=creds)
            service.events().patch(
                calendarId="primary", 
                eventId=interview.calendar_event_id, 
                body={"status": "cancelled"},
                sendUpdates="all"
            ).execute()
        except Exception as e:
            print(f"Failed to cancel Google Calendar event: {e}")

    interview.status = InterviewStatus.cancelled
    db.commit()
    db.refresh(interview)
    
    # Trigger Notifications
    try:
        from app.models.notification import Notification
        app = db.query(Application).filter(Application.id == interview.application_id).first()
        candidate = db.query(Candidate).filter(Candidate.id == app.candidate_id).first() if app else None
        
        # Notify Candidate
        if candidate:
            db.add(Notification(
                user_id=candidate.user_id,
                title="Interview Cancelled",
                message=f"Your interview scheduled on {interview.scheduled_at.strftime('%d %B %I:%M %p')} has been cancelled.",
                type="interview_cancelled"
            ))
            
        # Notify Resource Managers
        rms = db.query(User).filter(User.role == UserRole.resource_manager).all()
        for rm in rms:
            if rm.id != current_user.id:
                db.add(Notification(
                    user_id=rm.id,
                    title="Interview Cancelled",
                    message=f"Interview with {candidate.user.full_name if candidate else 'Candidate'} for {app.requisition.title if app else 'Role'} has been cancelled.",
                    type="interview_cancelled"
                ))
        
        # Notify Hiring Manager
        if app and app.requisition and app.requisition.assigned_hm_id and app.requisition.assigned_hm_id != current_user.id:
             db.add(Notification(
                user_id=app.requisition.assigned_hm_id,
                title="Interview Cancelled",
                message=f"Interview for your role {app.requisition.title} has been cancelled: {candidate.user.full_name if candidate else 'Candidate'}.",
                type="interview_cancelled"
            ))

        # 4. Notify Participants
        participant_emails = []
        if interview.participants:
            participant_emails = [e.strip() for e in interview.participants.split(',') if e.strip()]
            for pEmail in participant_emails:
                participant_user = db.query(User).filter(User.email == pEmail).first()
                if participant_user and participant_user.id != current_user.id:
                    db.add(Notification(
                        user_id=participant_user.id,
                        title="Interview Cancelled",
                        message=f"The interview for {candidate.user.full_name if candidate else 'Candidate'} on {interview.scheduled_at.strftime('%d %B %I:%M %p')} has been cancelled.",
                        type="interview_cancelled"
                    ))

        db.commit()

        # 5. Send Explicit Gmail Cancellations
        if current_user.google_access_token:
            from app.services.google_service import send_gmail
            cancel_time = interview.scheduled_at.strftime('%d %B %I:%M %p')
            
            # Email bodies
            cancel_html = f"""
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #fee2e2; border-radius: 12px; max-width: 600px; margin: auto;">
                <h2 style="color: #991b1b; margin-top: 0;">Interview Cancelled</h2>
                <p style="color: #475569;">The interview scheduled for <strong>{cancel_time}</strong> has been cancelled.</p>
                <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Candidate:</strong> {candidate.user.full_name if candidate else 'Candidate'}</p>
                    <p style="margin: 5px 0;"><strong>Role:</strong> {app.requisition.title if app and app.requisition else 'Role'}</p>
                </div>
                <p style="color: #64748b; font-size: 12px;">This event has been removed from your schedule.</p>
            </div>
            """
            
            # Send to Candidate
            if candidate:
                try:
                    send_gmail(
                        access_token=current_user.google_access_token,
                        refresh_token=current_user.google_refresh_token,
                        to=candidate.user.email,
                        subject="Interview Cancellation Notice - HireStream",
                        html_body=cancel_html
                    )
                except: pass

            # Send to Participants
            for pEmail in set(participant_emails):
                if pEmail.lower() == current_user.email.lower(): continue
                try:
                    send_gmail(
                        access_token=current_user.google_access_token,
                        refresh_token=current_user.google_refresh_token,
                        to=pEmail,
                        subject=f"Cancellation: Interview with {candidate.user.full_name if candidate else 'Candidate'}",
                        html_body=cancel_html
                    )
                except: pass

    except Exception as e:
        print(f"NOTIFICATION ERROR: {e}")

    return build_interview_response(interview, db)

@router.delete("/{interview_id}")
def delete_interview(
    interview_id: int,
    current_user: User = Depends(require_role(UserRole.resource_manager, UserRole.hiring_manager)),
    db: Session = Depends(get_db)
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Optional: Delete from Google Calendar
    if interview.calendar_event_id and current_user.google_access_token:
        try:
            from app.services.google_service import get_google_credentials
            from googleapiclient.discovery import build
            creds = get_google_credentials(current_user.google_access_token, current_user.google_refresh_token)
            service = build("calendar", "v3", credentials=creds)
            service.events().delete(calendarId="primary", eventId=interview.calendar_event_id, sendUpdates="all").execute()
        except Exception as e:
            print(f"Failed to delete Google Calendar event: {e}")

    db.delete(interview)
    db.commit()
    return {"message": "Interview deleted"}

@router.get("", response_model=List[InterviewResponse])
def list_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role in [UserRole.hiring_manager, UserRole.resource_manager]:
        # Filter interviews by the user's role to maintain strict separation
        interviews = db.query(Interview).filter(
            Interview.scheduled_role == current_user.role
        ).order_by(Interview.scheduled_at).all()
    elif current_user.role == UserRole.candidate:
        candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
        if not candidate:
            return []
        app_ids = [a.id for a in db.query(Application).filter(Application.candidate_id == candidate.id).all()]
        interviews = db.query(Interview).filter(Interview.application_id.in_(app_ids)).all()
    else:
        return []
    return [build_interview_response(i, db) for i in interviews]

@router.patch("/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: int,
    data: InterviewUpdate,
    current_user: User = Depends(require_role(UserRole.hiring_manager, UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(interview, field, value)
    db.commit()
    db.refresh(interview)
    return build_interview_response(interview, db)

@router.post("/clear-history")
def clear_interview_history(
    current_user: User = Depends(require_role(UserRole.resource_manager, UserRole.hiring_manager)),
    db: Session = Depends(get_db)
):
    # Only clear interviews belonging to the user's role that are officially in a terminal state
    query = db.query(Interview).filter(
        Interview.status.in_([InterviewStatus.completed, InterviewStatus.cancelled]),
        Interview.scheduled_role == current_user.role
    )
    
    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    return {"message": f"Successfully cleared {deleted_count} interviews from history"}

@router.post("/{interview_id}/review", response_model=InterviewResponse)
def submit_interview_review(
    interview_id: int,
    data: InterviewReview,
    current_user: User = Depends(require_role(UserRole.hiring_manager, UserRole.resource_manager)),
    db: Session = Depends(get_db)
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    interview.rating = data.rating
    interview.feedback = data.feedback
    interview.status = InterviewStatus.completed
    
    # Update application with RM evaluation results for handoff to HM
    if current_user.role == UserRole.resource_manager:
        app = db.query(Application).filter(Application.id == interview.application_id).first()
        if app:
            app.rm_rating = data.rating
            app.rm_feedback = data.feedback

    db.commit()
    db.refresh(interview)
    return build_interview_response(interview, db)
