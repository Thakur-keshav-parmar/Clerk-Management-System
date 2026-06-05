"""
One-time fix: set status='studying' on all student records missing a status.
Run from: /home/ec2-user/clerk/backend
Command:  python3 scripts/fix_student_status.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import repo
from services.student_service import get_all_students

students = get_all_students()
print(f"Total students found: {len(students)}")

fixed = 0
already_set = 0

for s in students:
    sid = s.get("id", "")
    current_status = s.get("status", "")
    if not current_status:
        pk = f"STUDENT#{sid}"
        item = repo.get_item(pk, "#META")
        if item:
            item["status"] = "studying"
            repo.put_item(item)
            fixed += 1
            print(f"  Fixed: {sid} — {s.get('name','?')}")
    else:
        already_set += 1

print(f"\nDone. Fixed {fixed}, already had status: {already_set}, total: {len(students)}")
