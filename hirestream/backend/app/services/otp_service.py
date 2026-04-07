import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.otp import OTP
import smtplib
from email.mime.text import MIMEText

def generate_otp(db: Session, email: str) -> str:
    # Clear previous OTPs for this email to avoid clutter
    db.query(OTP).filter(OTP.email == email).delete()
    
    otp_code = "".join([str(random.randint(0, 9)) for _ in range(6)])
    expiry = datetime.utcnow() + timedelta(minutes=5)
    
    db_otp = OTP(email=email, otp=otp_code, expiry=expiry)
    db.add(db_otp)
    db.commit()
    
    return otp_code

def verify_otp(db: Session, email: str, otp_code: str) -> bool:
    db_otp = db.query(OTP).filter(OTP.email == email, OTP.otp == otp_code).first()
    
    if not db_otp:
        return False
        
    if datetime.utcnow() > db_otp.expiry:
        db.delete(db_otp)
        db.commit()
        return False
        
    db.delete(db_otp)
    db.commit()
    return True

# If SMTP is needed to send OTP (assuming standard environment, or can route through Gmail API if token available)
def send_otp_email(to_email: str, otp_code: str):
    import os
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    
    if smtp_user and smtp_pass:
        try:
            msg = MIMEText(f"Your HireStream verification code is: {otp_code}")
            msg['Subject'] = 'HireStream Security Identity Verification'
            msg['From'] = f"HireStream Security <{smtp_user}>"
            msg['To'] = to_email
            
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            return True
        except Exception as e:
            print(f"SMTP Error: {e}")
            
    print(f"--- [SECURE OUTPUT] OTP for {to_email} is {otp_code} ---")
    return False

