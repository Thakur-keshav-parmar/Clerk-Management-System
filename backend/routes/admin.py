# Admin routes are handled via /api/courses endpoints (add/delete course, fee-structure, subjects, mst-config)
# This file is kept as placeholder for future admin-only operations
from fastapi import APIRouter
router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/health")
def health():
    return {"status": "ok"}
