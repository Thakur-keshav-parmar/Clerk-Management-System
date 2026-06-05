from fastapi import APIRouter, Depends
from services.payment_service import get_all_payments_v2
from services.student_service import get_all_students
from middleware.auth_middleware import require_auth
from datetime import date

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("")
def dashboard_stats(user=Depends(require_auth)):
    today     = date.today()
    today_str = today.isoformat()
    this_m    = today_str[:7]   # YYYY-MM

    students = get_all_students()
    payments = get_all_payments_v2()

    today_amt  = sum(int(p.get("amount",0)) for p in payments if p.get("date") == today_str)
    this_month = sum(int(p.get("amount",0)) for p in payments if (p.get("date","")).startswith(this_m))
    due_count  = len([s for s in students if int(s.get("due",0)) > 0])

    months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    monthly = [0] * 12
    for p in payments:
        try:
            m = int(p["date"].split("-")[1]) - 1
            monthly[m] += int(p.get("amount", 0))
        except Exception:
            pass

    recent = sorted(payments, key=lambda x: x.get("timeISO",""), reverse=True)[:15]

    return {
        "totalStudents":      len(students),
        "todayCollection":    today_amt,
        "thisMonth":          this_month,
        "dueStudents":        due_count,
        "monthlyCollection":  dict(zip(months, monthly)),
        "recentTransactions": recent,
    }
