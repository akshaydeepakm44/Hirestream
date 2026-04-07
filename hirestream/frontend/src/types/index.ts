export type UserRole = 'candidate' | 'hiring_manager' | 'resource_manager' | 'super_admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
    id: number;
    email: string;
    full_name: string;
    role: UserRole;
    status: UserStatus;
    company_name?: string;
}

export interface Requisition {
    id: number;
    title: string;
    role: string;
    department: string;
    location: string;
    required_skills: string;
    job_description: string;
    status: string;
    applicant_count?: number;
    created_at: string;
}

export type ApplicationStatus =
    | 'sourcing'
    | 'screening'
    | 'internal_shortlist'
    | 'assessment'
    | 'ready_for_hm'
    | 'interviewing'
    | 'onboarding'
    | 'rejected'
    | 'offer_extended'
    | 'hired';

export interface Application {
    id: number;
    candidate_id: number;
    requisition_id: number;
    status: ApplicationStatus;
    candidate_status?: string;
    resume_path?: string;
    resume_url?: string;
    ats_score?: number;
    rm_rating?: number;
    rm_feedback?: string;
    applied_at: string;
    candidate_name?: string;
    candidate_email?: string;
    candidate_skills?: string;
    candidate_experience?: number;
    candidate_current_title?: string;
    candidate_summary?: string;
    requisition_title?: string;
    requisition_role?: string;
    requisition_location?: string;
    requisition_department?: string;
    status_history?: StatusHistory[];
    interviews?: Interview[];
    assessments?: Assessment[];

    // Application Details
    dob?: string;
    country?: string;
    city?: string;
    state?: string;
    school?: string;
    degree?: string;
    degree_of_study?: string;
    area_of_study?: string;
    education_country?: string;
    is_first_job?: boolean;
    current_ctc?: number;
    expected_ctc?: number;
    willing_to_relocate?: boolean;
    available_start_date?: string;
    work_mode_preference?: string;
    relevant_experience?: number;
    current_role_title?: string;
    domain_experience?: string;
    screening_answers?: string;

    // Onboarding fields
    onboarding_status?: string;
    is_fresher?: boolean;
    offer_letter_sent?: boolean;
    offer_letter_accepted?: boolean;
    documents_submitted?: boolean;
    onboarding_completed?: boolean;
    
    offer_letter_path?: string;
    offer_letter_url?: string;
    acceptance_letter_path?: string;
    acceptance_letter_url?: string;
    
    // Document Paths
    aadhaar_path?: string;
    pan_path?: string;
    address_proof_path?: string;
    education_docs_path?: string;
    photo_path?: string;
    experience_docs_path?: string;
    relieving_letter_path?: string;
    payslips_path?: string;

    // Document URLs
    aadhaar_url?: string;
    pan_url?: string;
    address_proof_url?: string;
    education_docs_url?: string;
    photo_url?: string;
    experience_docs_url?: string;
    relieving_letter_url?: string;
    payslips_url?: string;

    // Verification Checklist (Legacy Compatibility)
    govt_id_verified?: boolean;
    academic_verified?: boolean;
    address_verified?: boolean;
    photo_verified?: boolean;
    experience_verified?: boolean;
    relieving_verified?: boolean;
    payslips_verified?: boolean;
}



export interface Assessment {
    id: number;
    application_id: number;
    title: string;
    instructions?: string;
    file_path?: string;
    deadline?: string;
    status: 'not_sent' | 'sent' | 'submitted' | 'reviewed' | 'accepted' | 'rejected';
    submission_file_path?: string;
    submission_link?: string;
    submitted_at?: string;
    score?: number;
    feedback?: string;
    reviewed_at?: string;
    created_at: string;
    updated_at: string;
}

export interface Interview {
    id: number;
    application_id: number;
    scheduled_by: number;
    scheduled_at: string;
    end_time?: string;
    duration_minutes?: number;
    rating?: number;
    feedback?: string;
    mode: string;
    status: string;
    location_or_link?: string;
    notes?: string;
    candidate_name?: string;
    candidate_email?: string;
    requisition_title?: string;
    requisition_role?: string;
    scheduled_role?: string;
}

export interface Analytics {
    total?: number;
    screening?: number;
    interview?: number;
    rejected?: number;
    offers?: number;

    active_roles?: number;
    candidates_in_interview?: number;
    scheduled_interviews?: number;
    offers_extended?: number;

    active_requisitions?: number;
    candidates_in_pipeline?: number;
    ready_for_hm?: number;
    avg_time_to_fill?: number;
    avg_applications_per_role?: number;

    // New RM Analytics
    talent_distribution?: { name: string; value: number }[];
    applicants_volume?: { name: string; apps: number }[];
    recent_applications?: Application[];
    interviews_today?: Interview[];
    pending_hire_requests_count?: number;
    pipeline?: { name: string; count: number }[];
}

export interface StatusHistory {
    id: number;
    status: string;
    changed_at: string;
    notes?: string;
}

export interface Notification {
    id: number;
    title: string;
    message: string;
    type: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}
