from fastapi import APIRouter, Depends, HTTPException, Query
from models.student import StudentCreate, StudentUpdate
from services import student_service
from middleware.auth_middleware import require_auth

router = APIRouter(prefix="/api/students", tags=["students"])

@router.get("")
def list_students(course: str = Query(None), user=Depends(require_auth)):
    return student_service.get_all_students(course)

@router.get("/{sid}")
def get_student(sid: str, user=Depends(require_auth)):
    s = student_service.get_student(sid)
    if not s:
        raise HTTPException(404, "Student not found")
    return s

@router.post("")
def create_student(body: StudentCreate, user=Depends(require_auth)):
    return student_service.create_student(body.model_dump())

@router.put("/{sid}")
def update_student(sid: str, body: StudentUpdate, user=Depends(require_auth)):
    s = student_service.update_student(sid, body.model_dump())
    if not s:
        raise HTTPException(404, "Student not found")
    return s

@router.put("/{sid}/status")
def update_student_status(sid: str, body: dict, user=Depends(require_auth)):
    allowed = {"studying", "break", "left", "passout"}
    if body.get("status") not in allowed:
        raise HTTPException(400, "Invalid status")
    s = student_service.update_student(sid, body)
    if not s:
        raise HTTPException(404, "Student not found")
    return s

@router.delete("/{sid}")
def delete_student(sid: str, user=Depends(require_auth)):
    student_service.delete_student(sid)
    return {"message": "Deleted"}
