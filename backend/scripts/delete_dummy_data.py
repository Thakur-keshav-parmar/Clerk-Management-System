"""
Deletes all dummy/seeded student records and their payments.
Keeps: courses, users, settings.

Run from: /home/ec2-user/clerk/backend
Command:  python3 scripts/delete_dummy_data.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import repo

# ── Delete all students ────────────────────────────────────────────────────
student_items = repo.scan_prefix("STUDENT#")
student_pks   = set(i["PK"] for i in student_items)

deleted_students = 0
for pk in student_pks:
    items = repo.query(pk)
    for item in items:
        repo.delete_item(item["PK"], item["SK"])
    deleted_students += 1
    print(f"  Deleted student: {pk}")

# ── Delete all payments ────────────────────────────────────────────────────
payment_items = repo.scan_prefix("PAYMENT#")
payment_pks   = set(i["PK"] for i in payment_items)

deleted_payments = 0
for pk in payment_pks:
    items = repo.query(pk)
    for item in items:
        repo.delete_item(item["PK"], item["SK"])
    deleted_payments += 1
    print(f"  Deleted payment group: {pk}")

# ── Delete all due records ─────────────────────────────────────────────────
due_items = repo.scan_prefix("DUE#")
due_pks   = set(i["PK"] for i in due_items)

deleted_dues = 0
for pk in due_pks:
    items = repo.query(pk)
    for item in items:
        repo.delete_item(item["PK"], item["SK"])
    deleted_dues += 1

print(f"\n{'='*50}")
print(f"Done.")
print(f"  Students deleted : {deleted_students}")
print(f"  Payment groups   : {deleted_payments}")
print(f"  Due records      : {deleted_dues}")
print(f"\nCourses, users, and settings are untouched.")
