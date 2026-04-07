from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/hiring_platform"
    AUTO_CREATE_DB: bool = True
    SECRET_KEY: str = "supersecretkey1234567890abcdefghijklmnopqrstuvwxyz"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 #this is the time in minutes for which the access token is valid for login
    UPLOAD_DIR: str = "uploads/resumes"
    MINIO_ENDPOINT:str = "http://192.168.0.9:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "uploads"
    
    # URL configurations
    BACKEND_URL: str = "http://localhost:8000"

    # Google Workspace Integration
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    GOOGLE_CALENDAR_ID: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

#this file is for configuration of the application that is to be used in the application
#this has the entire configuration of the application
