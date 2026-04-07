from fastapi import APIRouter, Depends
from app.models.user import User, UserRole
from app.schemas.requisition import JDGenerateRequest
from app.services.jd_service import generate_job_description
from app.routers.auth import require_role

router = APIRouter(prefix="/generate-jd", tags=["JD Generator"])

@router.post("")
def generate_jd(
    data: JDGenerateRequest,
    current_user: User = Depends(require_role(UserRole.hiring_manager, UserRole.resource_manager))
):
    print(f"\n[JD ROUTER] Received request from user {current_user.id} for: {data.title}")
    jd = generate_job_description(
        title=data.title,
        skills=data.skills,
        department=data.department,
        location=data.location
    )
    print(f"[JD ROUTER] Result length: {len(jd) if jd else 0}")
    return {"job_description": jd}
