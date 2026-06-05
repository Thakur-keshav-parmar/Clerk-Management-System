from db import repo
from datetime import date

def get_all_dues_summary() -> list[dict]:
    """Return students with outstanding fee balance."""
    students = repo.scan_prefix("STUDENT#")
    today = date.today().isoformat()
    result = []
    for s in students:
        if s.get("SK") != "#META":
            continue
        due = int(s.get("due", 0))
        if due <= 0:
            continue
        status = s.get("status", "studying")
        if status in ("left", "passout"):
            continue

        # Find next unpaid installment due date
        next_due_date = None
        for inst in s.get("installments", []):
            if not inst.get("paid"):
                next_due_date = inst.get("dueDate")
                break

        result.append({
            "id":          s.get("id", ""),
            "name":        s.get("name", ""),
            "course":      s.get("course", ""),
            "feeType":     s.get("feeType", "monthly"),
            "status":      status,
            "totalFees":   int(s.get("totalFees", 0)),
            "paid":        int(s.get("paid", 0)),
            "due":         due,
            "nextDueDate": next_due_date,
            "isOverdue":   bool(next_due_date and next_due_date < today),
        })

    result.sort(key=lambda x: x["due"], reverse=True)
    return result
