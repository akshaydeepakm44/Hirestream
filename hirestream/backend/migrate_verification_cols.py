
from app.database import SessionLocal, engine
from sqlalchemy import text

def add_columns():
    with engine.connect() as conn:
        try:
            print("Adding experience_verified column...")
            conn.execute(text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS experience_verified BOOLEAN DEFAULT FALSE"))
            print("Adding relieving_verified column...")
            conn.execute(text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS relieving_verified BOOLEAN DEFAULT FALSE"))
            print("Adding payslips_verified column...")
            conn.execute(text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS payslips_verified BOOLEAN DEFAULT FALSE"))
            conn.commit()
            print("Columns added successfully!")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_columns()
