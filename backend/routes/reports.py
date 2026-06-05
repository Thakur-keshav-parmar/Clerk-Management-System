from fastapi import APIRouter, Depends, Query
from datetime import date, datetime
from collections import defaultdict
from middleware.auth_middleware import require_auth
from services.payment_service import get_all_payments_v2
from services.student_service import get_all_students

router = APIRouter(prefix="/api/reports", tags=["reports"])

MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]


@router.get("")
def get_reports(year: int = Query(default=None), user=Depends(require_auth)):
    if not year:
        year = date.today().year

    students = get_all_students()
    payments = get_all_payments_v2()
    paid = [p for p in payments if p.get("status") == "Paid"]

    today = date.today()
    this_m = f"{today.year}-{str(today.month).zfill(2)}"
    if today.month > 1:
        last_m = f"{today.year}-{str(today.month - 1).zfill(2)}"
    else:
        last_m = f"{today.year - 1}-12"

    this_month     = sum(int(p.get("amount", 0)) for p in paid if p.get("date", "").startswith(this_m))
    last_month     = sum(int(p.get("amount", 0)) for p in paid if p.get("date", "").startswith(last_m))
    total_collected = sum(int(p.get("amount", 0)) for p in paid)
    total_due       = sum(int(s.get("due", 0)) for s in students)

    # Monthly admissions for selected year
    monthly_counts = [0] * 12
    for s in students:
        created = s.get("createdAt") or s.get("enrollDate") or s.get("admissionDate") or ""
        if created and str(year) in str(created):
            try:
                m = int(str(created)[5:7]) - 1
                if 0 <= m < 12:
                    monthly_counts[m] += 1
            except Exception:
                pass

    monthly_admissions = [{"month": m, "count": c} for m, c in zip(MONTHS, monthly_counts)]

    # Course-wise breakdown
    course_stats = defaultdict(lambda: {"studentCount": 0, "collected": 0})
    for s in students:
        c = s.get("course", "")
        if c:
            course_stats[c]["studentCount"] += 1
    for p in paid:
        c = p.get("course", "")
        if c:
            course_stats[c]["collected"] += int(p.get("amount", 0))

    course_wise = sorted(
        [{"course": k, **v} for k, v in course_stats.items()],
        key=lambda x: x["studentCount"], reverse=True
    )

    # Serious defaulters — due > 0 and enrolled 2+ months ago
    serious = []
    for s in students:
        due = int(s.get("due", 0))
        if due <= 0:
            continue
        created = s.get("createdAt") or s.get("enrollDate") or ""
        months_overdue = 0
        if created:
            try:
                enroll = datetime.fromisoformat(str(created)[:10]).date()
                months_overdue = max(0, (today - enroll).days // 30)
            except Exception:
                pass
        if months_overdue >= 2:
            serious.append({
                "id":           s.get("id", ""),
                "name":         s.get("name", ""),
                "course":       s.get("course", ""),
                "due":          due,
                "monthsOverdue": months_overdue,
                "contact":      s.get("contact") or s.get("fatherMobile") or s.get("phone") or "",
            })

    serious.sort(key=lambda x: x["monthsOverdue"], reverse=True)

    return {
        "year":               year,
        "thisMonth":          this_month,
        "lastMonth":          last_month,
        "totalCollected":     total_collected,
        "totalDue":           total_due,
        "monthlyAdmissions":  monthly_admissions,
        "courseWise":         course_wise,
        "seriousDefaulters":  serious[:20],
    }
