import random, hashlib, jwt
from datetime import datetime, timedelta, timezone
from db import repo
from config.settings import JWT_SECRET, JWT_ALGORITHM


def _hash(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()


def create(username: str) -> str:
    otp = str(random.randint(100000, 999999))
    expires = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    repo.put_item({
        "PK": f"OTP#{username}", "SK": "#RESET",
        "otp_hash": _hash(otp),
        "expires_at": expires,
    })
    return otp


def verify(username: str, otp: str) -> bool:
    item = repo.get_item(f"OTP#{username}", "#RESET")
    if not item:
        return False
    if item["otp_hash"] != _hash(otp):
        return False
    expires_raw = item["expires_at"]
    expires = datetime.fromisoformat(str(expires_raw)) if isinstance(expires_raw, str) else expires_raw
    repo.delete_item(f"OTP#{username}", "#RESET")
    if datetime.now(timezone.utc) > expires:
        return False
    return True


def create_reset_token(username: str) -> str:
    payload = {
        "sub": username,
        "purpose": "reset",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_reset_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("purpose") != "reset":
            return None
        return payload["sub"]
    except Exception:
        return None
