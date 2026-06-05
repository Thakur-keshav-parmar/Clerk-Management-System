import jwt, hashlib
from datetime import datetime, timedelta, timezone
from config.settings import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS
from db import repo

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed

def create_token(username: str, role: str) -> str:
    payload = {"sub": username, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

def login(username: str, password: str):
    item = repo.get_item(f"USER#{username}", "#META")
    if not item:
        return None, "Invalid username or password"
    if not verify_password(password, item["password_hash"]):
        return None, "Invalid username or password"
    token = create_token(username, item["role"])
    return {"token": token, "name": item["name"], "role": item["role"], "username": username}, None
