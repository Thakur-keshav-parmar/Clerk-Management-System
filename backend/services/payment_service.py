from datetime import datetime, timezone
from db import repo

TXN_PREFIX = "TXN"

def _new_txn_id() -> str:
    items = repo.query_gsi("ALL#PAYMENTS")
    return f"{TXN_PREFIX}{1000 + len(items) + 1}"

def collect_fee(student_id: str, amount: int, method: str = "Cash", payment_date: str = None, rzp_data: dict = None) -> dict | None:
    item = repo.get_item(f"STUDENT#{student_id}", "#META")
    if not item:
        return None
    due = int(item.get("due", 0))
    if amount <= 0 or amount > due:
        raise ValueError(f"Invalid amount. Due: {due}")

    now   = datetime.now(timezone.utc)
    today = payment_date or now.date().isoformat()

    remaining = amount
    for inst in item.get("installments", []):
        if remaining <= 0 or inst.get("paid"):
            continue
        needed = int(inst.get("amount", 0)) - int(inst.get("paidAmount", 0))
        if remaining >= needed:
            inst["paidAmount"] = int(inst.get("amount", 0))
            inst["paid"]       = True
            inst["partial"]    = False
            inst["paidDate"]   = today
            remaining -= needed
        else:
            inst["paidAmount"] = int(inst.get("paidAmount", 0)) + remaining
            inst["partial"]    = True
            inst["paidDate"]   = today
            remaining = 0

    item["paid"] = int(item.get("paid", 0)) + amount
    item["due"]  = int(item.get("totalFees", 0)) - item["paid"]
    repo.put_item(item)

    txn_id = _new_txn_id()
    txn = {
        "PK": f"STUDENT#{student_id}", "SK": f"PAYMENT#{txn_id}",
        "GSI1_PK": "ALL#PAYMENTS",     "GSI1_SK": f"{today}#{txn_id}",
        "txnId":       txn_id,
        "studentId":   student_id,
        "studentName": item.get("name", ""),
        "course":      item.get("course", ""),
        "amount":      amount,
        "method":      method,
        "date":        today,
        "displayTime": now.strftime("%I:%M:%S %p"),
        "timeISO":     now.isoformat(),
        "status":      "Paid",
    }
    if rzp_data:
        txn["online"] = rzp_data
    repo.put_item(txn)
    return txn

def get_all_payments_v2() -> list[dict]:
    all_students = repo.scan_prefix("STUDENT#")
    results, seen = [], set()
    for item in all_students:
        pk = item.get("PK", "")
        if pk in seen or item.get("SK") != "#META":
            continue
        seen.add(pk)
        for p in repo.query(pk, "PAYMENT#"):
            results.append({k: v for k, v in p.items() if k not in ("PK","SK","GSI1_PK","GSI1_SK")})
    results.sort(key=lambda x: x.get("timeISO",""), reverse=True)
    return results

def get_student_payments(student_id: str) -> list[dict]:
    items = repo.query(f"STUDENT#{student_id}", "PAYMENT#")
    return [{k: v for k, v in i.items() if k not in ("PK","SK","GSI1_PK","GSI1_SK")} for i in items]

def get_payment(txn_id: str) -> dict | None:
    for p in get_all_payments_v2():
        if p.get("txnId") == txn_id:
            return p
    return None
