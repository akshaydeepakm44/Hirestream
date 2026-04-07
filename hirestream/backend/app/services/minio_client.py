import boto3
from botocore.client import Config
from datetime import datetime
import uuid
import os
from app.core.config import settings

# Initialize boto3 client with custom settings for MinIO
try:
    s3_client = boto3.client(
        's3',
        endpoint_url=settings.MINIO_ENDPOINT,
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}, connect_timeout=5, retries={'max_attempts': 1}),
        region_name='us-east-1' # Default for MinIO
    )
except Exception as e:
    print(f"CRITICAL WARNING: Could not initialize MinIO client: {e}")
    s3_client = None

def get_presigned_upload_url(user_id: int, filename: str):
    """Generate a presigned POST policy to upload a file to MinIO."""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    object_name = f"resumes/{timestamp}-{filename}"
    
    if not s3_client:
        print("MinIO client not available, returning local fallback placeholder")
        return {
            "upload_url": "/api/files/upload",
            "fields": {},
            "object_key": f"local-{timestamp}-{filename}"
        }

    try:
        response = s3_client.generate_presigned_post(
            Bucket=settings.MINIO_BUCKET,
            Key=object_name,
            Fields={"Content-Type": "application/pdf"},
            Conditions=[
                {"Content-Type": "application/pdf"},
                ["content-length-range", 0, 10485760] # Max 10MB
            ],
            ExpiresIn=3600
        )
        return {
            "upload_url": response["url"],
            "fields": response["fields"],
            "object_key": object_name
        }
    except Exception as e:
        print(f"Error generating presigned post: {e}")
        return None

def get_presigned_download_url(object_name: str, bucket_name: str = None):
    """Generate a download URL. If s3_client exists, it uses presigned URL, else local fallback."""
    if not object_name:
        return None
        
    bucket = bucket_name or settings.MINIO_BUCKET
        
    # If the object name is already a full URL, return it
    if str(object_name).startswith(('http://', 'https://')):
        return object_name
        
    # Sanitize backslashes to forward slashes for URL path compatibility
    clean_name = str(object_name).replace('\\', '/')
        
    # Handle local path check for both S3 available or not
    is_local_path = clean_name.startswith('uploads/') or not s3_client
    
    if is_local_path:
        # Ensure we have a base URL for local paths to avoid relative path issues in frontend
        base_url = settings.BACKEND_URL.rstrip('/')
        
        # If it's already got uploads/ prefix, it's a local fallback stored path
        if clean_name.startswith('uploads/'):
            return f"{base_url}/{clean_name}"
        # If bucket_name is provided, it might be in uploads/{bucket_name}/{object_name}
        if bucket_name:
            return f"{base_url}/uploads/{bucket_name}/{clean_name}"
        return f"{base_url}/uploads/{clean_name}"
    
    try:
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket,
                'Key': clean_name
            },
            ExpiresIn=3600 # URL valid for 1 hour
        )
        return presigned_url
    except Exception as e:
        print(f"Error generating download URL: {e}")
        return None

def get_object_content(object_name: str) -> bytes:
    """Fetch the raw bytes of an object from MinIO with local fallback."""
    # 1. Try MinIO if available
    if s3_client:
        try:
            # Clean object name if it looks like a local path (for MinIO key)
            key = object_name.replace('\\', '/')
            if key.startswith('uploads/resumes/'):
                key = key.replace('uploads/resumes/', '', 1) # Sometimes saved with prefix
            
            response = s3_client.get_object(Bucket=settings.MINIO_BUCKET, Key=key)
            return response['Body'].read()
        except Exception as e:
            print(f"MinIO fetch failed for {object_name}, trying local: {e}")

    # 2. Fallback to local file
    try:
        # Use basename to avoid path duplication/formatting issues
        filename = os.path.basename(object_name)
        # Search path is BASE_DIR/uploads/resumes/filename
        # Given settings.UPLOAD_DIR is already uploads/resumes
        local_path = os.path.join(settings.UPLOAD_DIR, filename)
        
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return f.read()
        else:
            print(f"Local file not found at {local_path}")
            return b""
    except Exception as e:
        print(f"Local fallback read failed for {object_name}: {e}")
        return b""

def upload_file_to_minio(file_obj, bucket_name: str, object_name: str):
    """Upload a file to MinIO bucket. Also ensures bucket exists."""
    if not s3_client:
        # Fallback: Save locally to 'uploads/{bucket_name}/{object_name}'
        save_path = os.path.join("uploads", bucket_name, os.path.dirname(object_name))
        os.makedirs(save_path, exist_ok=True)
        full_path = os.path.join("uploads", bucket_name, object_name)
        with open(full_path, "wb") as f:
            # handle file-like object or UploadFile
            if hasattr(file_obj, "read"):
                f.write(file_obj.read())
            else:
                f.write(file_obj)
        print(f"Stored local file: {full_path}")
        return True

    try:
        # Ensure bucket exists
        ensure_buckets([bucket_name])
        
        # Determine extra params
        extra_args = {}
        if object_name.endswith('.pdf'):
            extra_args['ContentType'] = 'application/pdf'
            
        s3_client.upload_fileobj(
            file_obj,
            Bucket=bucket_name,
            Key=object_name,
            ExtraArgs=extra_args
        )
        return True
    except Exception as e:
        print(f"MinIO upload error: {e}")
        # If it's a connection error, disable s3_client to use local fallback for next calls
        if "endpoint URL" in str(e) or "Connect" in str(e):
            print("Disabling MinIO client due to connection error.")
            import app.services.minio_client as mc
            mc.s3_client = None
        return False

def ensure_buckets(bucket_names: list):
    """Ensure all required buckets exist in MinIO."""
    if not s3_client:
        return
        
    try:
        existing = [b['Name'] for b in s3_client.list_buckets()['Buckets']]
        for b in bucket_names:
            if b not in existing:
                s3_client.create_bucket(Bucket=b)
                print(f"Created MinIO bucket: {b}")
    except Exception as e:
        print(f"MinIO bucket initialization error: {e}")
        # Disable s3_client on connection error
        if "endpoint URL" in str(e) or "Connect" in str(e):
            import app.services.minio_client as mc
            mc.s3_client = None

# Automated Initialization for Onboarding
if s3_client:
    ensure_buckets(['offer-letters', 'acceptance-letters', 'candidate-documents', 'experience-documents'])


