from fastapi import APIRouter, Depends
from datetime import date, datetime
from middleware.auth_middleware import require_auth
from services.student_service import get_all_students

router = APIRouter(prefix="/api/defaulters", tags=["defaulters"])

@router.get("")
def get_defaulters(user=Depends(require_auth)):
    today    = date.today()
    students = get_all_students()
    result   = []

    for s in students:
        due = int(s.get("due", 0))
        if due <= 0:
            continue
        status = s.get("status", "studying")
        if status in ("left", "passout"):
            continue

        # Months since admission
        enrolled = s.get("admissionDate") or s.get("createdAt") or ""
        months_overdue = 0
        if enrolled:
            try:
                enroll_date  = datetime.fromisoformat(str(enrolled)[:10]).date()
                months_overdue = max(0, (today - enroll_date).days // 30)
            except Exception:
                pass

        result.append({
            "id":            s.get("id", ""),
            "name":          s.get("name", ""),
            "course":        s.get("course", ""),
            "status":        status,
            "due":           due,
            "paid":          int(s.get("paid", 0)),
            "perPeriod":     int(s.get("perPeriod", 0)),
            "monthsOverdue": months_overdue,
            "contact":       s.get("contact") or s.get("fatherMobile") or "",
            "isEscalated":   months_overdue >= 3,
            "snoozeNote":    "",
        })

    result.sort(key=lambda x: x["due"], reverse=True)
    return result
