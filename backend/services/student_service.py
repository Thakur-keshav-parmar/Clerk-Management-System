import math
from datetime import datetime, date, timedelta
from db import repo

def _today_str():
    return date.today().isoformat()

def _get_duration_months(course: dict) -> int:
    dur  = int(course.get("duration", 1) or 1)
    unit = course.get("duration_unit", "years")
    return dur if unit == "months" else dur * 12

def build_installments(total_fees: int, periods: int = 4, days_per_period: int = 30) -> list[dict]:
    if not total_fees or total_fees <= 0 or periods <= 0:
        return []
    per  = math.floor(total_fees / periods)
    last = total_fees - per * (periods - 1)
    today = date.today()
    return [
        {
            "num": i + 1,
            "amount": (last if i == periods - 1 else per),
            "dueDate": (today + timedelta(days=i * days_per_period)).isoformat(),
            "paid": False, "partial": False, "paidDate": None, "paidAmount": 0,
        }
        for i in range(periods)
    ]

def get_all_students(course_code: str = None) -> list[dict]:
    if course_code:
        items = repo.query_gsi(f"COURSE#{course_code}", "STUDENT#")
        students = []
        for idx_item in items:
            sid = idx_item["GSI1_SK"].replace("STUDENT#", "")
            s = repo.get_item(f"STUDENT#{sid}", "#META")
            if s:
                students.append(_clean(s))
        return students
    else:
        items = repo.scan_prefix("STUDENT#")
        return [_clean(i) for i in items if i.get("SK") == "#META"]

def get_student(sid: str) -> dict | None:
    item = repo.get_item(f"STUDENT#{sid}", "#META")
    return _clean(item) if item else None

def _clean(item: dict) -> dict:
    exclude = {"PK", "SK", "GSI1_PK", "GSI1_SK"}
    return {k: v for k, v in item.items() if k not in exclude}

def _next_id() -> str:
    existing = repo.scan_prefix("STUDENT#")
    students = [i for i in existing if i.get("SK") == "#META"]
    num = len(students) + 1
    return f"EDU{str(num).zfill(3)}"

def create_student(data: dict) -> dict:
    from services.course_service import get_course as _get_course

    # Roll number
    manual = (data.get("manualRollNumber") or "").strip().upper()
    if manual:
        if repo.get_item(f"STUDENT#{manual}", "#META"):
            raise ValueError(f"Roll number {manual} already exists")
        sid = manual
    else:
        sid = _next_id()

    # Fee calculation
    fee_type = data.get("feeType", "monthly")
    waiver   = int(data.get("waiverAmount", 0) or 0)
    course   = _get_course(data["course"])

    if course:
        if fee_type == "yearly":
            base_per  = int(course.get("yearly_fee", 0) or 0)
            periods   = int(course.get("duration", 1) or 1)
            days_pp   = 365
        else:
            base_per  = int(course.get("monthly_fee", 0) or 0)
            periods   = _get_duration_months(course)
            days_pp   = 30
    else:
        base_per, periods, days_pp = 0, 12, 30

    per_period  = max(0, base_per - waiver)
    total_fees  = per_period * periods
    installments = build_installments(total_fees, periods, days_pp)

    skip = {"manualRollNumber", "waiverAmount", "feeType", "totalFees"}
    item = {
        "PK": f"STUDENT#{sid}", "SK": "#META",
        "GSI1_PK": f"COURSE#{data['course']}", "GSI1_SK": f"STUDENT#{sid}",
        "id":           sid,
        "status":       "studying",
        "feeType":      fee_type,
        "waiverAmount": waiver,
        "perPeriod":    per_period,
        "totalFees":    total_fees,
        "paid":         0,
        "due":          total_fees,
        "installments": installments,
        "feeConfirmed": True,
        **{k: v for k, v in data.items() if k not in skip},
    }
    repo.put_item(item)
    return _clean(item)

def update_student(sid: str, data: dict) -> dict | None:
    existing = repo.get_item(f"STUDENT#{sid}", "#META")
    if not existing:
        return None
    protect = {"id", "totalFees", "paid", "due", "installments",
               "PK", "SK", "GSI1_PK", "GSI1_SK", "manualRollNumber", "feeConfirmed"}
    existing.update({k: v for k, v in data.items() if k not in protect and v not in (None, "")})
    repo.put_item(existing)
    return _clean(existing)

def delete_student(sid: str) -> bool:
    for item in repo.query(f"STUDENT#{sid}"):
        repo.delete_item(item["PK"], item["SK"])
    return True
