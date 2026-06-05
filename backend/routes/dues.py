from fastapi import APIRouter, Depends
from services import dues_service
from middleware.auth_middleware import require_auth

router = APIRouter(prefix="/api/dues", tags=["dues"])

@router.get("")
def all_dues(user=Depends(require_auth)):
    return dues_service.get_all_dues_summary()
