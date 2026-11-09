import boto3
from botocore.client import Config
from datetime import datetime
import os
from typing import Optional, Dict, Any
from app.core.config import settings

s3_client = None

# Initialize boto3 client with custom settings for MinIO / S3 only if endpoint configured
if settings.MINIO_ENDPOINT and settings.MINIO_ENDPOINT.strip():
    try:
        s3_client = boto3.client(
            's3',
            endpoint_url=settings.MINIO_ENDPOINT.strip(),
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            config=Config(
                signature_version='s3v4',
                s3={'addressing_style': 'path'},
                connect_timeout=3,
                retries={'max_attempts': 1}
            ),
            region_name='us-east-1'
        )
    except Exception as e:
        print(f"[STORAGE WARNING] Could not initialize MinIO client: {e}. Defaulting to local disk fallback.")
        s3_client = None
else:
    # No endpoint configured -> use local fallback directly
    s3_client = None

_verified_buckets = set()

def ensure_buckets(bucket_names: list) -> None:
    """Ensure all required buckets exist in MinIO (safe, non-blocking check)."""
    global s3_client
    if not s3_client:
        return
        
    try:
        existing = [b['Name'] for b in s3_client.list_buckets().get('Buckets', [])]
        for b in bucket_names:
            if b not in existing and b not in _verified_buckets:
                try:
                    s3_client.create_bucket(Bucket=b)
                    _verified_buckets.add(b)
                except Exception as create_err:
                    print(f"[STORAGE] Bucket creation notice for {b}: {create_err}")
    except Exception as e:
        print(f"[STORAGE NOTICE] MinIO unavailable: {e}. Switching to local storage fallback.")
        s3_client = None

def get_presigned_upload_url(user_id: int, filename: str) -> Optional[Dict[str, Any]]:
    """Generate a presigned POST policy to upload a file to MinIO, or local fallback."""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    object_name = f"resumes/{timestamp}-{filename}"
    
    if not s3_client:
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
        print(f"[STORAGE] Error generating presigned post: {e}")
        return {
            "upload_url": "/api/files/upload",
            "fields": {},
            "object_key": f"local-{timestamp}-{filename}"
        }

def get_presigned_download_url(object_name: str, bucket_name: Optional[str] = None) -> Optional[str]:
    """Generate a download URL. If s3_client exists, it uses presigned URL, else local fallback."""
    if not object_name:
        return None
        
    bucket = bucket_name or settings.MINIO_BUCKET
        
    # If the object name is already a full URL, return it
    if str(object_name).startswith(('http://', 'https://')):
        return object_name
        
    clean_name = str(object_name).replace('\\', '/')
    is_local_path = clean_name.startswith('uploads/') or not s3_client
    
    if is_local_path:
        base_url = settings.BACKEND_URL.rstrip('/')
        if clean_name.startswith('uploads/'):
            return f"{base_url}/{clean_name}"
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
            ExpiresIn=3600
        )
        return presigned_url
    except Exception as e:
        print(f"[STORAGE] Error generating presigned download URL: {e}")
        base_url = settings.BACKEND_URL.rstrip('/')
        return f"{base_url}/uploads/{clean_name}"

def get_object_content(object_name: str) -> bytes:
    """Fetch the raw bytes of an object from MinIO with local filesystem fallback."""
    if s3_client:
        try:
            key = object_name.replace('\\', '/')
            if key.startswith('uploads/resumes/'):
                key = key.replace('uploads/resumes/', '', 1)
            response = s3_client.get_object(Bucket=settings.MINIO_BUCKET, Key=key)
            return response['Body'].read()
        except Exception as e:
            print(f"[STORAGE] MinIO fetch failed for {object_name}, attempting local read: {e}")

    try:
        filename = os.path.basename(object_name)
        local_path = os.path.join(settings.UPLOAD_DIR, filename)
        
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return f.read()
        
        alt_path = os.path.join("uploads", object_name)
        if os.path.exists(alt_path):
            with open(alt_path, "rb") as f:
                return f.read()
                
        return b""
    except Exception as e:
        print(f"[STORAGE] Local fallback read failed for {object_name}: {e}")
        return b""

def upload_file_to_minio(file_obj, bucket_name: str, object_name: str) -> bool:
    """Upload a file to MinIO bucket with automatic local disk fallback."""
    global s3_client
    if not s3_client:
        save_path = os.path.join("uploads", bucket_name, os.path.dirname(object_name))
        os.makedirs(save_path, exist_ok=True)
        full_path = os.path.join("uploads", bucket_name, object_name)
        with open(full_path, "wb") as f:
            if hasattr(file_obj, "read"):
                f.write(file_obj.read())
            else:
                f.write(file_obj)
        return True

    try:
        ensure_buckets([bucket_name])
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
        print(f"[STORAGE] MinIO upload error: {e}. Switching to local disk fallback.")
        s3_client = None
        return upload_file_to_minio(file_obj, bucket_name, object_name)
