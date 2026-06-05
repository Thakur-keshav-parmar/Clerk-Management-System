"""
Dummy data seeder — adds 15 realistic students with partial/full payments.
Run from backend directory: python scripts/seed_dummy.py
Safe to run multiple times (checks for existing IDs).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.student_service import create_student, get_all_students
from services.payment_service import collect_fee

STUDENTS = [
    # name, course, semester, batch, fatherName, gender, city, mobile, dob
    ("Aarav Sharma",    "Python",  "1", "2024-25", "Rajesh Sharma",   "Male",   "Delhi",     "9876543210", "2005-03-12"),
    ("Priya Patel",     "WebDev",  "1", "2024-25", "Suresh Patel",    "Female", "Mumbai",    "9876543211", "2004-07-22"),
    ("Rohan Verma",     "DataSci", "1", "2024-25", "Mahesh Verma",    "Male",   "Pune",      "9876543212", "2005-01-08"),
    ("Sneha Gupta",     "ML",      "1", "2024-25", "Anil Gupta",      "Female", "Jaipur",    "9876543213", "2004-11-30"),
    ("Karan Singh",     "Java",    "1", "2024-25", "Harjeet Singh",   "Male",   "Chandigarh","9876543214", "2005-05-17"),
    ("Pooja Mishra",    "Android", "1", "2024-25", "Dinesh Mishra",   "Female", "Lucknow",   "9876543215", "2004-09-03"),
    ("Arjun Yadav",     "UIUX",    "1", "2024-25", "Ramesh Yadav",    "Male",   "Patna",     "9876543216", "2005-02-25"),
    ("Nisha Joshi",     "CySec",   "1", "2024-25", "Prakash Joshi",   "Female", "Nagpur",    "9876543217", "2004-06-14"),
    ("Vikram Tiwari",   "Python",  "2", "2023-24", "Sunil Tiwari",    "Male",   "Bhopal",    "9876543218", "2003-08-19"),
    ("Deepika Rao",     "WebDev",  "2", "2023-24", "Krishna Rao",     "Female", "Hyderabad", "9876543219", "2003-12-07"),
    ("Ankit Dubey",     "DataSci", "2", "2023-24", "Sanjay Dubey",    "Male",   "Varanasi",  "9876543220", "2003-04-28"),
    ("Kavya Nair",      "ML",      "2", "2023-24", "Rajan Nair",      "Female", "Kochi",     "9876543221", "2003-10-15"),
    ("Harsh Agarwal",   "Java",    "2", "2023-24", "Vinod Agarwal",   "Male",   "Agra",      "9876543222", "2003-06-02"),
    ("Megha Chaudhari", "Android", "2", "2023-24", "Santosh Chaudhari","Female","Nashik",    "9876543223", "2003-03-20"),
    ("Sameer Khan",     "CySec",   "2", "2023-24", "Imran Khan",      "Male",   "Surat",     "9876543224", "2003-09-11"),
]

# How much of total fees each student has paid (fraction)
PAYMENT_FRACTIONS = [
    0,      # Aarav — not paid anything
    0.25,   # Priya — 1st installment
    0.50,   # Rohan — 2 installments
    0.75,   # Sneha — 3 installments
    1.00,   # Karan — fully paid
    0.25,   # Pooja
    0.50,   # Arjun
    0,      # Nisha — not paid
    1.00,   # Vikram — fully paid
    0.75,   # Deepika
    0.25,   # Ankit
    1.00,   # Kavya — fully paid
    0.50,   # Harsh
    0,      # Megha — not paid
    0.25,   # Sameer
]


def seed_dummy():
    existing = get_all_students()
    existing_names = {s["name"] for s in existing}

    created = 0
    skipped = 0

    for i, (name, course, sem, batch, father, gender, city, mobile, dob) in enumerate(STUDENTS):
        if name in existing_names:
            print(f"  Skip (exists): {name}")
            skipped += 1
            continue

        student = create_student({
            "name": name,
            "course": course,
            "semester": sem,
            "batch": batch,
            "fatherName": father,
            "fatherMobile": mobile,
            "gender": gender,
            "dob": dob,
            "city": city,
            "state": "India",
            "country": "India",
            "category": "General",
            "bloodGroup": "B+",
            "totalFees": 0,  # will be auto-set from fee structure
        })

        sid = student["id"]
        total = student["totalFees"]
        fraction = PAYMENT_FRACTIONS[i]

        if fraction > 0:
            pay_amount = round(total * fraction)
            # Clamp to actual due (rounding may overshoot)
            pay_amount = min(pay_amount, student["due"])
            if pay_amount > 0:
                collect_fee(sid, pay_amount)
                print(f"  Created: {name} ({sid}) -- paid Rs.{pay_amount:,} of Rs.{total:,}")
            else:
                print(f"  Created: {name} ({sid}) -- Rs.0 paid")
        else:
            print(f"  Created: {name} ({sid}) -- Rs.0 paid")

        created += 1

    print(f"\nDone! Created {created} students, skipped {skipped} existing.")


if __name__ == "__main__":
    seed_dummy()
