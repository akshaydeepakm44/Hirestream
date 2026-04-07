from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime
from app.models.application import ApplicationStatus
from app.schemas.assessment import AssessmentSchema

class ApplicationBase(BaseModel):
    requisition_id: int
    cover_letter: Optional[str] = None

class DocumentVerificationRequest(BaseModel):
    govt_id: bool = False
    academic: bool = False
    address: bool = False
    photo: bool = False

class ApplicationCreate(ApplicationBase):

    dob: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    
    school: Optional[str] = None
    degree: Optional[str] = None
    degree_of_study: Optional[str] = None
    area_of_study: Optional[str] = None
    education_country: Optional[str] = None
    
    is_first_job: Optional[bool] = False
    current_ctc: Optional[float] = None
    expected_ctc: Optional[float] = None
    willing_to_relocate: Optional[bool] = False
    available_start_date: Optional[str] = None
    work_mode_preference: Optional[str] = None
    relevant_experience: Optional[float] = None
    current_role_title: Optional[str] = None
    domain_experience: Optional[str] = None
    employment_type: Optional[str] = None
    screening_answers: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    notes: Optional[str] = None
    rm_rating: Optional[int] = None
    rm_feedback: Optional[str] = None

class StatusHistoryResponse(BaseModel):
    id: int
    status: str
    changed_at: datetime
    notes: Optional[str] = None

    @field_serializer('changed_at')
    def serialize_changed_at(self, value: datetime) -> str:
        from app.services.time_utils import format_utc_iso
        return format_utc_iso(value)

    class Config:
        from_attributes = True

class ApplicationResponse(BaseModel):
    id: int
    candidate_id: int
    requisition_id: int
    status: ApplicationStatus
    candidate_status: Optional[str] = None
    resume_path: Optional[str] = None
    resume_url: Optional[str] = None
    ats_score: Optional[float] = None
    cover_letter: Optional[str] = None
    notes: Optional[str] = None
    rm_rating: Optional[int] = None
    rm_feedback: Optional[str] = None
    applied_at: datetime
    updated_at: Optional[datetime] = None
    
    dob: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    
    school: Optional[str] = None
    degree: Optional[str] = None
    degree_of_study: Optional[str] = None
    area_of_study: Optional[str] = None
    education_country: Optional[str] = None
    
    is_first_job: Optional[bool] = False
    current_ctc: Optional[float] = None
    expected_ctc: Optional[float] = None
    willing_to_relocate: Optional[bool] = False
    available_start_date: Optional[str] = None
    work_mode_preference: Optional[str] = None
    relevant_experience: Optional[float] = None
    current_role_title: Optional[str] = None
    domain_experience: Optional[str] = None
    employment_type: Optional[str] = None
    screening_answers: Optional[str] = None

    @field_serializer('applied_at', 'updated_at')
    def serialize_datetimes(self, value: Optional[datetime]) -> Optional[str]:
        if value is None: return None
        from app.services.time_utils import format_utc_iso
        return format_utc_iso(value)

    # Nested info
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    candidate_skills: Optional[str] = None
    candidate_experience: Optional[float] = None
    candidate_current_title: Optional[str] = None
    candidate_summary: Optional[str] = None
    requisition_title: Optional[str] = None
    requisition_role: Optional[str] = None
    requisition_location: Optional[str] = None
    
    status_history: list[StatusHistoryResponse] = []
    interviews: list[dict] = []
    assessments: list[AssessmentSchema] = []
    
    # Onboarding
    onboarding_status: Optional[str] = None
    is_fresher: bool = True
    offer_letter_sent: bool = False
    offer_letter_accepted: bool = False
    documents_submitted: bool = False
    onboarding_completed: bool = False
    
    offer_letter_path: Optional[str] = None
    offer_letter_url: Optional[str] = None
    acceptance_letter_path: Optional[str] = None
    acceptance_letter_url: Optional[str] = None
    
    # Document Paths
    aadhaar_path: Optional[str] = None
    pan_path: Optional[str] = None
    address_proof_path: Optional[str] = None
    education_docs_path: Optional[str] = None
    photo_path: Optional[str] = None
    experience_docs_path: Optional[str] = None
    relieving_letter_path: Optional[str] = None
    payslips_path: Optional[str] = None
    
    # Step 2 Paths
    govt_id_path: Optional[str] = None
    academic_docs_path: Optional[str] = None
    address_proof_path: Optional[str] = None
    photo_path: Optional[str] = None
    resignation_proof_path: Optional[str] = None
    
    # Verification Checklist
    govt_id_verified: bool = False
    academic_verified: bool = False
    address_verified: bool = False
    photo_verified: bool = False
    experience_verified: bool = False
    relieving_verified: bool = False
    payslips_verified: bool = False

    # Document URLs for RM
    aadhaar_url: Optional[str] = None
    pan_url: Optional[str] = None
    address_proof_url: Optional[str] = None
    education_docs_url: Optional[str] = None
    photo_url: Optional[str] = None
    experience_docs_url: Optional[str] = None
    relieving_letter_url: Optional[str] = None
    payslips_url: Optional[str] = None



    class Config:
        from_attributes = True

class ATSAnalyzeRequest(BaseModel):
    application_id: int
