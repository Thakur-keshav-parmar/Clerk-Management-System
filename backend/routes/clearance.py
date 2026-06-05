from fastapi import APIRouter, Depends
from services import clearance_service
from middleware.auth_middleware import require_auth

router = APIRouter(prefix="/api/clearance", tags=["clearance"])

@router.get("")
def all_clearance(user=Depends(require_auth)):
    return clearance_service.get_clearance_summary()
