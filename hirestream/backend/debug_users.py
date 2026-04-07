from app.database import engine
from sqlalchemy import text

def debug_users():
    with engine.connect() as con:
        print("--- Current User State ---")
        users = con.execute(text("SELECT id, email, role, is_active FROM users WHERE email = 'dm4516718@gmail.com' OR role = 'super_admin'")).fetchall()
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, Active: {u.is_active}")
        
    print("\n--- Transitioning Admin ---")
    new_admin = 'dm4516718@gmail.com'
    old_admin = 'thirumalesh.konathala@datai2i.com'
    
    with engine.connect() as con:
        # Disable all instances of the old admin
        con.execute(text("UPDATE users SET is_active = false WHERE email = :old"), {"old": old_admin})
        
        # Check for existing entries for the new admin
        existing_rm = con.execute(text("SELECT id FROM users WHERE email = :email AND role != 'super_admin'"), {"email": new_admin}).fetchone()
        existing_sa = con.execute(text("SELECT id FROM users WHERE email = :email AND role = 'super_admin'"), {"email": new_admin}).fetchone()
        
        if existing_sa:
            # If they already have a super_admin entry, make sure it's active and approved
            print(f"Update existing super_admin entry for {new_admin}")
            con.execute(text("UPDATE users SET is_active = true, status = 'approved' WHERE id = :id"), {"id": existing_sa.id})
            # And disable their RM entry if it exists to avoid confusion
            if existing_rm:
                con.execute(text("UPDATE users SET is_active = false WHERE id = :id"), {"id": existing_rm.id})
        elif existing_rm:
            # If they only have an RM entry, promote it
            print(f"Promoting RM entry for {new_admin} to super_admin")
            con.execute(text("UPDATE users SET role = 'super_admin', is_active = true, status = 'approved' WHERE id = :id"), {"id": existing_rm.id})
        else:
            # Create fresh
            print(f"Creating fresh super_admin entry for {new_admin}")
            hashed = '$2b$12$r8.y.0GDvIaDyEnBm48YrQ0jke2xLva1RiUWNIB6j4/8X1vHJQ'
            con.execute(text("""
                INSERT INTO users (email, full_name, hashed_password, role, status, is_active) 
                VALUES (:email, 'Super Admin', :hashed, 'super_admin', 'approved', true)
            """), {"email": new_admin, "hashed": hashed})
        
        con.commit()
    print("--- SUCCESS ---")

if __name__ == "__main__":
    debug_users()
