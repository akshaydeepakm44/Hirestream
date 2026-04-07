import os
import httpx
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

from app.core.config import settings

CLIENT_ID = settings.GOOGLE_CLIENT_ID
CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET
REDIRECT_URI = settings.GOOGLE_REDIRECT_URI
CALENDAR_ID = settings.GOOGLE_CALENDAR_ID or "primary"

SCOPES = [
    "openid", 
    "email", 
    "profile", 
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/gmail.send"
]

def get_google_auth_url(redirect_uri: str = REDIRECT_URI, state: str = "candidate") -> str:
    scopes_str = " ".join(SCOPES)
    url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={CLIENT_ID}&response_type=code&scope={scopes_str}&redirect_uri={redirect_uri}&access_type=offline&prompt=consent&state={state}"
    return url

async def get_google_tokens(code: str, redirect_uri: str = REDIRECT_URI) -> Dict[str, Any]:
    token_url = "https://oauth2.googleapis.com/token"
    async with httpx.AsyncClient() as client:
        resp = await client.post(token_url, data={
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri
        })
        if resp.status_code != 200:
            print(f"GOOGLE TOKEN EXCHANGE FAILED with status {resp.status_code}: {resp.text}")
        resp.raise_for_status()
        token_data = resp.json()
        
        # Now fetch user profile info
        access_token = token_data.get("access_token")
        profile_resp = await client.get("https://www.googleapis.com/oauth2/v3/userinfo", headers={"Authorization": f"Bearer {access_token}"})
        profile_resp.raise_for_status()
        profile_data = profile_resp.json()
        
        return {
            "tokens": token_data,
            "profile": profile_data
        }

def get_google_credentials(access_token: str, refresh_token: Optional[str] = None) -> Credentials:
    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        scopes=SCOPES
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    return creds

def send_gmail(
    access_token: str, 
    refresh_token: str, 
    to: str, 
    subject: str, 
    html_body: str,
    cc: Optional[list[str]] = None,
    bcc: Optional[list[str]] = None,
    attachments: Optional[list[dict[str, Any]]] = None  # List of {'name': str, 'content': bytes}
):
    creds = get_google_credentials(access_token, refresh_token)
    service = build("gmail", "v1", credentials=creds)
    
    message = MIMEMultipart()
    message["To"] = to
    message["Subject"] = subject
    
    if cc:
        message["Cc"] = ", ".join(cc)
    if bcc:
        message["Bcc"] = ", ".join(bcc)
        
    message.attach(MIMEText(html_body, "html"))
    
    if attachments:
        for att in attachments:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(att["content"])
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename={att['name']}"
            )
            message.attach(part)
    
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    
    sent_message = service.users().messages().send(userId="me", body={"raw": raw_message}).execute()
    return sent_message

def create_google_meet(
    access_token: str, 
    refresh_token: str, 
    candidate_email: str, 
    start_time: datetime, 
    duration_minutes: int, 
    title: str, 
    description: str,
    participants: Optional[list[str]] = None,
    organizer_email: Optional[str] = None
):
    creds = get_google_credentials(access_token, refresh_token)
    service = build("calendar", "v3", credentials=creds)
    
    end_time = start_time + timedelta(minutes=duration_minutes)
    
    # 1. Prepare unique attendee list (deduplicate by email)
    attendee_emails = set([candidate_email.strip().lower()])
    if participants:
        for p in participants:
            if p and p.strip():
                attendee_emails.add(p.strip().lower())
    
    # Explicitly add organizer to ensuring they see the event and help trigger notifications
    if organizer_email:
        attendee_emails.add(organizer_email.strip().lower())

    # Build the final attendee list for Google API
    attendees = []
    for email in attendee_emails:
        entry = {"email": email}
        # Organizer auto-accepts
        if organizer_email and email == organizer_email.strip().lower():
            entry["responseStatus"] = "accepted"
        attendees.append(entry)
            
    # Time safety for Google API (UTC ISO8601 with Z)
    start_iso = start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
    end_iso = end_time.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    event = {
        "summary": title,
        "description": description,
        "start": {
            "dateTime": start_iso,
            "timeZone": "UTC"
        },
        "end": {
            "dateTime": end_iso,
            "timeZone": "UTC"
        },
        "attendees": attendees,
        "conferenceData": {
            "createRequest": {
                "requestId": f"meet_{start_time.strftime('%Y%md%H%M%S')}_{candidate_email}",
                "conferenceSolutionKey": { "type": "hangoutsMeet" }
            }
        }
    }
    
    print(f"--- GOOGLE CALENDAR EVENT PAYLOAD ---")
    print(f"Summary: {event['summary']}")
    print(f"Attendees: {event['attendees']}")
    print(f"SendUpdates: all")
    
    created_event = service.events().insert(
        calendarId="primary", 
        body=event, 
        conferenceDataVersion=1,
        sendUpdates="all"
    ).execute()
    
    return {
        "event_id": created_event.get("id"),
        "meet_link": created_event.get("hangoutLink", "No link attached")
    }
