from app.database import engine
from sqlalchemy import text

def verify_final():
    with engine.connect() as con:
        print("--- Final Verified Super Admins ---")
        users = con.execute(text("SELECT id, email, role, is_active FROM users WHERE role = 'super_admin'")).fetchall()
        if not users:
            print("NO SUPER ADMINS FOUND!")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, Active: {u.is_active}")
        
        print("\n--- Check Old Admin Presence ---")
        old = con.execute(text("SELECT id FROM users WHERE email = 'thirumalesh.konathala@datai2i.com'")).fetchone()
        if old:
            print(f"WARNING: Old admin still exists with ID {old.id}")
        else:
            print("Old admin successfully purged.")

if __name__ == "__main__":
    verify_final()
