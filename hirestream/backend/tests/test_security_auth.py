from app.core.security import verify_password, get_password_hash, create_access_token, decode_token
from datetime import timedelta

def test_password_hashing_and_verification():
    plain_password = "SecurePassword123!"
    hashed = get_password_hash(plain_password)
    
    assert hashed != plain_password
    assert verify_password(plain_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_lifecycle():
    data = {"sub": "42", "role": "candidate"}
    token = create_access_token(data, expires_delta=timedelta(minutes=15))
    
    assert isinstance(token, str)
    decoded = decode_token(token)
    assert decoded is not None
    assert decoded["sub"] == "42"
    assert decoded["role"] == "candidate"

def test_jwt_invalid_token():
    invalid_token = "invalid.bearer.token"
    decoded = decode_token(invalid_token)
    assert decoded is None
