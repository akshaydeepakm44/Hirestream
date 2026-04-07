"""
Seed script to populate the database with demo data.
Run with: python seed_data.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.candidate import Candidate
from app.models.requisition import Requisition, RequisitionStatus
from app.models.application import Application, ApplicationStatus
from app.models.interview import Interview, InterviewMode, InterviewStatus
from app.core.security import get_password_hash
from datetime import datetime, timedelta
import random

Base.metadata.create_all(bind=engine)
db = SessionLocal()

def seed():
    print("Seeding database...")

    # Clear existing data
    from app.models.status_history import ApplicationStatusHistory
    db.query(Interview).delete()
    db.query(ApplicationStatusHistory).delete()
    db.query(Application).delete()
    db.query(Requisition).delete()
    db.query(Candidate).delete()
    db.query(User).delete()
    db.commit()

    # Create users
    sa = User(email="dm4516718@gmail.com", full_name="Sarah Chen", hashed_password=get_password_hash("12345678"), role=UserRole.super_admin, status="approved")
    rm = User(email="rm1@company.com", full_name="Michael Scott", hashed_password=get_password_hash("12345678"), role=UserRole.resource_manager, status="approved")
    hm1 = User(email="akshay@alphanome.ai", full_name="Akshay Alphanome", hashed_password=get_password_hash("12345678"), role=UserRole.hiring_manager, status="approved")
    hm2 = User(email="hm2@company.com", full_name="Lisa Johnson", hashed_password=get_password_hash("12345678"), role=UserRole.hiring_manager, status="approved")
    
    candidates_data = [
        ("alice@email.com", "Alice Johnson", "alice"),
        ("bob@email.com", "Bob Smith", "bob"),
        ("carol@email.com", "Carol White", "carol"),
        ("david@email.com", "David Kumar", "david"),
        ("emma@email.com", "Emma Davis", "emma"),
    ]
    
    db.add_all([sa, rm, hm1, hm2])
    db.commit()

    candidate_users = []
    for email, name, _ in candidates_data:
        u = User(email=email, full_name=name, hashed_password=get_password_hash("password123"), role=UserRole.candidate)
        db.add(u)
        candidate_users.append(u)
    db.commit()

    # Create candidate profiles
    profiles = [
        Candidate(user_id=candidate_users[0].id, phone="+1-555-0101", location="San Francisco, CA",
                  experience_years=5, current_title="Senior Frontend Developer",
                  skills="React, TypeScript, JavaScript, CSS, Node.js, GraphQL, AWS",
                  summary="Experienced frontend developer with 5+ years building scalable web applications."),
        Candidate(user_id=candidate_users[1].id, phone="+1-555-0102", location="New York, NY",
                  experience_years=3, current_title="Backend Developer",
                  skills="Python, FastAPI, PostgreSQL, Docker, Kubernetes, Redis, AWS",
                  summary="Backend engineer passionate about building high-performance APIs."),
        Candidate(user_id=candidate_users[2].id, phone="+1-555-0103", location="Austin, TX",
                  experience_years=7, current_title="Full Stack Engineer",
                  skills="React, Python, Django, PostgreSQL, Docker, GraphQL, TypeScript",
                  summary="Full stack developer with expertise in both frontend and backend technologies."),
        Candidate(user_id=candidate_users[3].id, phone="+1-555-0104", location="Seattle, WA",
                  experience_years=4, current_title="Data Engineer",
                  skills="Python, Spark, Kafka, PostgreSQL, AWS, Airflow, dbt, Pandas",
                  summary="Data engineer focused on building robust data pipelines and analytics systems."),
        Candidate(user_id=candidate_users[4].id, phone="+1-555-0105", location="Boston, MA",
                  experience_years=6, current_title="DevOps Engineer",
                  skills="Docker, Kubernetes, AWS, CI/CD, Terraform, Linux, Python, Jenkins",
                  summary="DevOps specialist with deep expertise in cloud infrastructure and automation."),
    ]
    db.add_all(profiles)
    db.commit()

    # Create requisitions
    reqs = [
        Requisition(title="Senior Frontend Engineer", role="Frontend Engineer", department="Engineering",
                    location="Remote", required_skills="React, TypeScript, JavaScript, CSS, Node.js",
                    job_description="We are looking for a Senior Frontend Engineer to build amazing user experiences...",
                    created_by=hm1.id, assigned_hm_id=hm1.id, status=RequisitionStatus.open),
        Requisition(title="Backend Python Developer", role="Backend Developer", department="Engineering",
                    location="San Francisco, CA", required_skills="Python, FastAPI, PostgreSQL, Docker",
                    job_description="Join our backend team to build scalable microservices...",
                    created_by=hm1.id, assigned_hm_id=hm1.id, status=RequisitionStatus.open),
        Requisition(title="Full Stack Engineer", role="Full Stack Engineer", department="Product",
                    location="Hybrid - NYC", required_skills="React, Python, Django, PostgreSQL, Docker",
                    job_description="Build end-to-end features for our product platform...",
                    created_by=rm.id, assigned_hm_id=hm2.id, status=RequisitionStatus.open),
        Requisition(title="Data Engineer", role="Data Engineer", department="Data",
                    location="Remote", required_skills="Python, Spark, Kafka, PostgreSQL, AWS",
                    job_description="Build and maintain our data pipeline infrastructure...",
                    created_by=rm.id, assigned_hm_id=hm2.id, status=RequisitionStatus.open),
        Requisition(title="DevOps Engineer", role="DevOps", department="Infrastructure",
                    location="Austin, TX", required_skills="Docker, Kubernetes, AWS, Terraform, CI/CD",
                    job_description="Manage and scale our cloud infrastructure...",
                    created_by=hm2.id, assigned_hm_id=hm2.id, status=RequisitionStatus.open),
    ]
    db.add_all(reqs)
    db.commit()

    # Create applications with various statuses
    statuses = [
        ApplicationStatus.sourcing,
        ApplicationStatus.screening,
        ApplicationStatus.assessment,
        ApplicationStatus.ready_for_hm,
        ApplicationStatus.interviewing,
    ]
    
    applications = [
        Application(candidate_id=profiles[0].id, requisition_id=reqs[0].id,
                    status=ApplicationStatus.interviewing, ats_score=87.5,
                    resume_text="React TypeScript JavaScript CSS Node.js GraphQL AWS frontend developer"),
        Application(candidate_id=profiles[1].id, requisition_id=reqs[1].id,
                    status=ApplicationStatus.ready_for_hm, ats_score=91.2,
                    resume_text="Python FastAPI PostgreSQL Docker Kubernetes Redis backend developer"),
        Application(candidate_id=profiles[2].id, requisition_id=reqs[2].id,
                    status=ApplicationStatus.screening, ats_score=76.3,
                    resume_text="React Python Django PostgreSQL Docker GraphQL TypeScript fullstack"),
        Application(candidate_id=profiles[3].id, requisition_id=reqs[3].id,
                    status=ApplicationStatus.assessment, ats_score=83.1,
                    resume_text="Python Spark Kafka PostgreSQL AWS Airflow dbt data engineer"),
        Application(candidate_id=profiles[4].id, requisition_id=reqs[4].id,
                    status=ApplicationStatus.sourcing, ats_score=79.8,
                    resume_text="Docker Kubernetes AWS Terraform Linux Python Jenkins devops"),
        Application(candidate_id=profiles[0].id, requisition_id=reqs[2].id,
                    status=ApplicationStatus.rejected, ats_score=45.0,
                    resume_text="React TypeScript JavaScript frontend developer"),
        Application(candidate_id=profiles[1].id, requisition_id=reqs[0].id,
                    status=ApplicationStatus.screening, ats_score=62.0,
                    resume_text="Python backend developer Node.js"),
    ]
    db.add_all(applications)
    db.commit()

    # Create interviews
    now = datetime.utcnow()
    interviews = [
        Interview(application_id=applications[0].id, scheduled_by=hm1.id,
                  scheduled_at=now + timedelta(days=2), mode=InterviewMode.online,
                  location_or_link="https://meet.google.com/abc-xyz", status=InterviewStatus.scheduled),
        Interview(application_id=applications[1].id, scheduled_by=rm.id,
                  scheduled_at=now + timedelta(days=3), mode=InterviewMode.in_person,
                  location_or_link="Office - Conference Room A", status=InterviewStatus.scheduled),
        Interview(application_id=applications[3].id, scheduled_by=hm2.id,
                  scheduled_at=now + timedelta(days=5), mode=InterviewMode.phone,
                  location_or_link="+1-555-9876", status=InterviewStatus.scheduled),
    ]
    db.add_all(interviews)
    db.commit()

    print("\n✅ Database seeded successfully!")
    print("\nDemo Credentials:")
    print("  Super Admin: dm4516718@gmail.com / 12345678")
    print("  Resource Manager: rm1@company.com / 12345678")
    print("  Hiring Manager 1: akshay@alphanome.ai / 12345678")
    print("  Hiring Manager 2: hm2@company.com / 12345678")
    print("  Candidates:")
    for email, name, _ in candidates_data:
        print(f"    {email} / password123 ({name})")

if __name__ == "__main__":
    seed()
    db.close()
