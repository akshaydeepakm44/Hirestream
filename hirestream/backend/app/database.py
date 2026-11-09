from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import re

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Sanitize connection string for safe log output (hide passwords)
sanitized_url = re.sub(r"://([^:]+):([^@]+)@", r"://\1:***@", db_url)
print(f"[DATABASE] Initializing engine with: {sanitized_url}")

# Configure engine options
engine_args = {
    "pool_pre_ping": True,
}

if "sqlite" in db_url:
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    engine_args["pool_recycle"] = 300
    engine_args["pool_size"] = 10
    engine_args["max_overflow"] = 20

engine = create_engine(db_url, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
