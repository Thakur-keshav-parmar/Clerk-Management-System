from fastapi import APIRouter, HTTPException, Depends
from models.course import CourseCreate, FeeStructureUpdate, SubjectsUpdate, MSTConfigUpdate
from services import course_service
from middleware.auth_middleware import require_auth

router = APIRouter(prefix="/api/courses", tags=["courses"])

@router.get("")
def list_courses(user=Depends(require_auth)):
    return course_service.get_all_courses()

@router.post("")
def add_course(body: CourseCreate, user=Depends(require_auth)):
    try:
        return course_service.add_course(
            body.code, body.name, body.duration, body.semesters,
            duration_unit=body.duration_unit,
            monthly_fee=body.monthly_fee,
            yearly_fee=body.yearly_fee,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.delete("/{code}")
def remove_course(code: str, user=Depends(require_auth)):
    course_service.delete_course(code.upper())
    return {"message": "Deleted"}

@router.get("/{code}/fee-structure")
def get_fees(code: str, user=Depends(require_auth)):
    return course_service.get_fee_structure(code.upper())

@router.put("/{code}/fee-structure")
def update_fees(code: str, body: FeeStructureUpdate, user=Depends(require_auth)):
    result = course_service.update_fee_structure(
        code.upper(),
        monthly_fee=body.monthly_fee,
        yearly_fee=body.yearly_fee,
    )
    if not result:
        raise HTTPException(404, "Course not found")
    return result

@router.get("/{code}/subjects")
def get_subjects(code: str, user=Depends(require_auth)):
    return course_service.get_subjects(code.upper())

@router.put("/{code}/subjects")
def update_subjects(code: str, body: SubjectsUpdate, user=Depends(require_auth)):
    return course_service.update_subjects(code.upper(), body.subjects)

@router.get("/{code}/mst-config")
def get_mst_config(code: str, user=Depends(require_auth)):
    return course_service.get_mst_config(code.upper())

@router.put("/{code}/mst-config")
def update_mst_config(code: str, body: MSTConfigUpdate, user=Depends(require_auth)):
    return course_service.update_mst_config(code.upper(), body.model_dump())
