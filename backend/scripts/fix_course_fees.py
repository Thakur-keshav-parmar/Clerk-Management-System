"""
One-time fix: add monthly_fee / yearly_fee fields to existing course records.
Run from: /home/ec2-user/clerk/backend
Command:  python3 scripts/fix_course_fees.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import repo

# Default fees per course code prefix
DEFAULTS = {
    "BCA": (3000, 30000), "MCA": (4000, 40000),
    "BBA": (2500, 25000), "MBA": (4000, 40000),
    "BCOM": (2000, 20000), "MCOM": (3500, 35000),
    "BSC": (2500, 25000), "MSC": (3500, 35000),
    "BA": (2000, 20000),  "MA": (3000, 30000),
}

items = repo.query_gsi("ALL#COURSES")
fixed = 0

for item in items:
    code = item.get("code", "")
    changed = False
    if not item.get("monthly_fee"):
        monthly, yearly = next(((m, y) for k, (m, y) in DEFAULTS.items() if code.startswith(k)), (2500, 25000))
        item["monthly_fee"] = monthly
        item["yearly_fee"]  = yearly
        changed = True
    if not item.get("duration_unit"):
        item["duration_unit"] = "years"
        changed = True
    if changed:
        repo.put_item(item)
        fixed += 1
        print(f"  Fixed: {code} — monthly={item['monthly_fee']} yearly={item['yearly_fee']}")

print(f"\nDone. Updated {fixed} / {len(items)} courses.")
