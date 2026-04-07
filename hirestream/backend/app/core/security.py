from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt as _bcrypt
from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return _bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return _bcrypt.hashpw(password.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

#from the above complete code in the each funtion we can explain:
#1.verify_password:  this uses bcrypt to verify the password
#2.get_password_hash: this uses bcrypt to hash the password
#3.create_access_token: this uses jwt to create the access token
#4.decode_token: this uses jwt to decode the token

#the jwt is generated using the secret key and the algorithm

