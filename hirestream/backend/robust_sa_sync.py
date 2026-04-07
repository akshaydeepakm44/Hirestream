from app.database import engine
from sqlalchemy import text

def direct_sync():
    # Pre-generated bcrypt hash for 'thirumalesh123'
    hashed = '$2b$12$r8.y.0GDvIaDyEnBm48YrQ0jke2xLva1RiUWNIB6j4/8X1vHJQ'
    new_admin = 'dm4516718@gmail.com'
    old_admin = 'thirumalesh.konathala@datai2i.com'
    
    with engine.connect() as con:
        # 1. Update existing user if they exist (regardless of current role)
        con.execute(text("UPDATE users SET role = 'super_admin', status = 'approved', is_active = true WHERE email = :email"), {"email": new_admin})
        
        # 2. If no user with that email exists, insert them
        check = con.execute(text("SELECT id FROM users WHERE email = :email"), {"email": new_admin}).fetchone()
        if not check:
            con.execute(text("""
                INSERT INTO users (email, full_name, hashed_password, role, status, is_active) 
                VALUES (:email, 'Super Admin', :hashed, 'super_admin', 'approved', true)
            """), {"email": new_admin, "hashed": hashed})
        
        # 3. Disable the old Super Admin
        con.execute(text("UPDATE users SET is_active = false WHERE email = :old"), {"old": old_admin})
        
        con.commit()
    print(f"SA SYNC SUCCESSFUL: {new_admin} is now Super Admin.")

if __name__ == "__main__":
    direct_sync()
