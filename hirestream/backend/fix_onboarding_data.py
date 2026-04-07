
from app.database import SessionLocal
from app.models.application import Application, ApplicationStatus

def fix_data():
    db = SessionLocal()
    try:
        # Find applications that are in the onboarding status but have NONE as their onboarding process status
        apps = db.query(Application).filter(
            Application.status == ApplicationStatus.onboarding,
            Application.onboarding_status == "NONE"
        ).all()
        
        print(f"Found {len(apps)} applications to fix.")
        for app in apps:
            app.onboarding_status = "ONBOARDING_PENDING"
            print(f"Fixed Application ID {app.id}")
            
        db.commit()
        print("Data fix complete.")
    finally:
        db.close()

if __name__ == "__main__":
    fix_data()
