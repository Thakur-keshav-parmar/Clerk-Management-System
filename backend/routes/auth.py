from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db import repo
from models.user import LoginRequest
from services.auth_service import login, hash_password
from services import otp_service, whatsapp_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


class ForgotRequest(BaseModel):
    username: str


class VerifyOTPRequest(BaseModel):
    username: str
    otp: str


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str


@router.post("/login")
def do_login(body: LoginRequest):
    result, error = login(body.username, body.password)
    if error:
        raise HTTPException(status_code=401, detail=error)
    return result


@router.post("/logout")
def do_logout():
    return {"message": "Logged out"}


@router.post("/forgot")
def forgot_password(body: ForgotRequest):
    item = repo.get_item(f"USER#{body.username}", "#META")
    if not item:
        raise HTTPException(status_code=404, detail="Username not found.")
    phone = item.get("phone", "").strip()
    if not phone:
        raise HTTPException(
            status_code=400,
            detail="No WhatsApp number registered for this account. Contact admin to add your phone number."
        )
    otp = otp_service.create(body.username)
    try:
        whatsapp_service.send_otp(phone, otp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")
    masked = "XXXXXX" + phone.strip()[-4:]
    return {"message": f"OTP sent to WhatsApp {masked}"}


@router.post("/verify-otp")
def verify_otp(body: VerifyOTPRequest):
    if not otp_service.verify(body.username, body.otp):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    reset_token = otp_service.create_reset_token(body.username)
    return {"reset_token": reset_token}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest):
    username = otp_service.verify_reset_token(body.reset_token)
    if not username:
        raise HTTPException(status_code=400, detail="Invalid or expired reset session. Start over.")
    if len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters.")
    item = repo.get_item(f"USER#{username}", "#META")
    if not item:
        raise HTTPException(status_code=404, detail="User not found.")
    item["password_hash"] = hash_password(body.new_password)
    repo.put_item(item)
    return {"message": "Password reset successfully."}
