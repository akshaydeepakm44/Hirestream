from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from app.services.minio_client import get_presigned_upload_url, get_presigned_download_url, s3_client
from app.routers.auth import get_current_user
from app.models.user import User
from app.core.config import settings
import uuid
from datetime import datetime
import io
import os

router = APIRouter(prefix="/files", tags=["File Storage"])

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a file directly to MinIO via the backend proxy."""
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        object_key = f"resumes/{timestamp}-{uuid.uuid4()}-{file.filename}"
        
        # Read file into memory
        file_content = await file.read()
        
        # 1. ALWAYS save a local copy first as a robust backup
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        local_filename = f"{timestamp}-{uuid.uuid4()}-{file.filename}"
        local_path = os.path.join(settings.UPLOAD_DIR, local_filename)
        with open(local_path, "wb") as f:
            f.write(file_content)
        
        # 2. Try to upload to MinIO
        if s3_client is None:
            print("MinIO client not initialized, using local storage only")
            return {"object_key": local_path, "is_local": True}

        # 3. Extract skills if it's a PDF
        extracted_skills = []
        if file.content_type == 'application/pdf' or file.filename.lower().endswith('.pdf'):
            from app.services.ats_service import extract_text_from_resume, extract_skills_from_text
            try:
                text = extract_text_from_resume(file_content)
                extracted_skills = extract_skills_from_text(text)
            except Exception as e:
                print(f"Skill extraction during upload failed: {e}")

        try:
            s3_client.put_object(
                Bucket=settings.MINIO_BUCKET, 
                Key=object_key,
                Body=io.BytesIO(file_content),
                ContentType=file.content_type or 'application/pdf'
            )
            print(f"Successfully uploaded {object_key} to MinIO")
            return {"object_key": object_key, "extracted_skills": extracted_skills}
        except Exception as s3_err:
            print(f"MinIO Upload failed, falling back to local: {s3_err}")
            # If MinIO fails, we return the local path as the object_key
            # Our path handling logic should be able to distinguish or we just use local_path
            return {"object_key": local_path, "is_local": True}
            
    except Exception as e:
        print(f"Critical upload error: {e}")
        # Even if everything fails, we don't want to crash the server
        raise HTTPException(status_code=500, detail=f"Upload system error: {str(e)}")

@router.get("/presigned-upload")
def get_upload_url(
    filename: str = Query(..., description="The name of the file to be uploaded"),
    current_user: User = Depends(get_current_user)
):
    """Get a presigned URL to upload a file."""
    try:
        data = get_presigned_upload_url(current_user.id, filename)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presigned-download")
def get_download_url(
    object_key: str = Query(..., description="The S3 object key of the file"),
    # current_user: User = Depends(get_current_user) # Optionally restrict to authenticated users
):
    """Get a presigned URL to download a file."""
    url = get_presigned_download_url(object_key)
    if not url:
        raise HTTPException(status_code=404, detail="File could not be found or download URL generation failed")
    return {"download_url": url}
