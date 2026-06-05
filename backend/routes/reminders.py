from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date
import uuid
from middleware.auth_middleware import require_auth
from db import repo
from services.student_service import get_student

router = APIRouter(prefix="/api/reminders", tags=["reminders"])

class ReminderCreate(BaseModel):
    studentId: str
    reminderDate: str
    promiseAmount: int = 0
    note: str = ""

class RescheduleBody(BaseModel):
    reminderDate: str

def _all_reminders() -> list[dict]:
    items = repo.query_gsi("ALL#REMINDERS")
    result = []
    for i in items:
        r = repo.get_item(i["PK"], "#META")
        if r:
            result.append({k: v for k, v in r.items() if k not in ("PK","SK","GSI1_PK","GSI1_SK")})
    result.sort(key=lambda x: x.get("reminderDate",""))
    return result

@router.get("")
def list_reminders(user=Depends(require_auth)):
    today = date.today().isoformat()
    all_r = _all_reminders()
    active = []
    for r in all_r:
        if r.get("status") == "done":
            continue
        # escalate overdue pending reminders
        if r.get("reminderDate","") < today and r.get("status") == "pending":
            r["status"] = "escalated"
        active.append(r)
    return active

@router.post("")
def create_reminder(body: ReminderCreate, user=Depends(require_auth)):
    st = get_student(body.studentId)
    if not st:
        raise HTTPException(404, "Student not found")

    rid  = str(uuid.uuid4())[:8].upper()
    item = {
        "PK": f"REMINDER#{rid}", "SK": "#META",
        "GSI1_PK": "ALL#REMINDERS", "GSI1_SK": f"REMINDER#{body.reminderDate}#{rid}",
        "id":            rid,
        "studentId":     body.studentId,
        "studentName":   st.get("name",""),
        "course":        st.get("course",""),
        "currentDue":    int(st.get("due", 0)),
        "reminderDate":  body.reminderDate,
        "promiseAmount": body.promiseAmount,
        "note":          body.note,
        "status":        "pending",
    }
    repo.put_item(item)
    return {k: v for k, v in item.items() if k not in ("PK","SK","GSI1_PK","GSI1_SK")}

@router.put("/{rid}/done")
def mark_done(rid: str, user=Depends(require_auth)):
    item = repo.get_item(f"REMINDER#{rid}", "#META")
    if not item:
        raise HTTPException(404, "Reminder not found")
    item["status"] = "done"
    repo.put_item(item)
    return {"status": "done"}

@router.put("/{rid}/reschedule")
def reschedule(rid: str, body: RescheduleBody, user=Depends(require_auth)):
    item = repo.get_item(f"REMINDER#{rid}", "#META")
    if not item:
        raise HTTPException(404, "Reminder not found")
    item["reminderDate"] = body.reminderDate
    item["status"]       = "pending"
    item["GSI1_SK"]      = f"REMINDER#{body.reminderDate}#{rid}"
    repo.put_item(item)
    return {k: v for k, v in item.items() if k not in ("PK","SK","GSI1_PK","GSI1_SK")}
