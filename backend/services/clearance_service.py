from db import repo

def get_clearance_summary() -> list[dict]:
    students = repo.scan_prefix("STUDENT#")
    result = []
    for s in students:
        if s.get("SK") != "#META":
            continue
        total_fees = int(s.get("totalFees") or 0)
        paid       = int(s.get("paid")      or 0)
        # Recompute due on-the-fly so stale DB values never hide a paid student
        due        = total_fees - paid
        cleared    = due <= 0
        result.append({
            "id":        s.get("id"),
            "name":      s.get("name"),
            "course":    s.get("course"),
            "semester":  s.get("semester"),
            "feeType":   s.get("feeType", "monthly"),
            "totalFees": total_fees,
            "paid":      paid,
            "due":       due,
            "cleared":   cleared,
        })
    return result
