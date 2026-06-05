from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from db import repo
from services.auth_service import hash_password
from middleware.auth_middleware import require_auth

router = APIRouter(prefix="/api/users", tags=["users"])

class UserCreate(BaseModel):
    username: str
    name: str
    password: str
    role: str
    phone: Optional[str] = ""

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    phone: Optional[str] = None

def _clean(item: dict) -> dict:
    return {k: v for k, v in item.items() if k not in ["PK", "SK", "GSI1_PK", "GSI1_SK", "password_hash"]}

@router.get("")
def list_users(user=Depends(require_auth)):
    items = repo.query_gsi("ALL#USERS")
    return [_clean(i) for i in items]

@router.post("")
def create_user(body: UserCreate, user=Depends(require_auth)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only.")
    existing = repo.get_item(f"USER#{body.username}", "#META")
    if existing:
        raise HTTPException(status_code=409, detail=f"Username '{body.username}' already exists.")
    item = {
        "PK": f"USER#{body.username}", "SK": "#META",
        "GSI1_PK": "ALL#USERS", "GSI1_SK": f"USER#{body.username}",
        "username": body.username,
        "name": body.name,
        "role": body.role,
        "phone": body.phone or "",
        "password_hash": hash_password(body.password),
    }
    repo.put_item(item)
    return _clean(item)

@router.put("/{username}")
def update_user(username: str, body: UserUpdate, user=Depends(require_auth)):
    if user["role"] != "admin" and user["sub"] != username:
        raise HTTPException(status_code=403, detail="Admin only.")
    item = repo.get_item(f"USER#{username}", "#META")
    if not item:
        raise HTTPException(status_code=404, detail="User not found.")
    if body.name:
        item["name"] = body.name
    if body.role and user["role"] == "admin":
        item["role"] = body.role
    if body.phone is not None:
        item["phone"] = body.phone
    if body.password and len(body.password) >= 4:
        item["password_hash"] = hash_password(body.password)
    repo.put_item(item)
    return _clean(item)

@router.delete("/{username}")
def delete_user(username: str, user=Depends(require_auth)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only.")
    if user.get("sub") == username:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
    item = repo.get_item(f"USER#{username}", "#META")
    if not item:
        raise HTTPException(status_code=404, detail="User not found.")
    repo.delete_item(f"USER#{username}", "#META")
    return {"message": f"User '{username}' deleted."}
