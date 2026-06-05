"""
Dummy data seeder for EC2/DynamoDB — adds 18 realistic students with varied payment status.
Run from ~/clerk: python3 scripts/seed_dummy_ec2.py
Safe to run multiple times (skips existing names).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.student_service import create_student, get_all_students
from services.payment_service import collect_fee

# course, semester, batch
STUDENTS = [
    ("Aarav Sharma",      "BCA",  "1", "2024-25", "Rajesh Sharma",    "Male",   "Delhi",       "9876543210", "2005-03-12"),
    ("Priya Patel",       "BCA",  "2", "2024-25", "Suresh Patel",     "Female", "Mumbai",      "9876543211", "2005-07-22"),
    ("Rohan Verma",       "MCA",  "1", "2023-24", "Mahesh Verma",     "Male",   "Pune",        "9876543212", "2003-01-08"),
    ("Sneha Gupta",       "MCA",  "2", "2023-24", "Anil Gupta",       "Female", "Jaipur",      "9876543213", "2002-11-30"),
    ("Karan Singh",       "BBA",  "1", "2024-25", "Harjeet Singh",    "Male",   "Chandigarh",  "9876543214", "2005-05-17"),
    ("Pooja Mishra",      "BBA",  "3", "2023-24", "Dinesh Mishra",    "Female", "Lucknow",     "9876543215", "2004-09-03"),
    ("Arjun Yadav",       "MBA",  "1", "2024-25", "Ramesh Yadav",     "Male",   "Patna",       "9876543216", "2001-02-25"),
    ("Nisha Joshi",       "MBA",  "2", "2023-24", "Prakash Joshi",    "Female", "Nagpur",      "9876543217", "2000-06-14"),
    ("Vikram Tiwari",     "BCOM", "1", "2024-25", "Sunil Tiwari",     "Male",   "Bhopal",      "9876543218", "2005-08-19"),
    ("Deepika Rao",       "BCOM", "4", "2022-23", "Krishna Rao",      "Female", "Hyderabad",   "9876543219", "2003-12-07"),
    ("Ankit Dubey",       "BSC",  "2", "2024-25", "Sanjay Dubey",     "Male",   "Varanasi",    "9876543220", "2004-04-28"),
    ("Kavya Nair",        "BSC",  "1", "2024-25", "Rajan Nair",       "Female", "Kochi",       "9876543221", "2005-10-15"),
    ("Harsh Agarwal",     "BA",   "3", "2023-24", "Vinod Agarwal",    "Male",   "Agra",        "9876543222", "2004-06-02"),
    ("Megha Chaudhari",   "BA",   "1", "2024-25", "Santosh Chaudhari","Female", "Nashik",      "9876543223", "2005-03-20"),
    ("Sameer Khan",       "MA",   "2", "2023-24", "Imran Khan",       "Male",   "Surat",       "9876543224", "2001-09-11"),
    ("Ritika Saxena",     "MCOM", "1", "2024-25", "Ramkumar Saxena",  "Female", "Kanpur",      "9876543225", "2002-01-05"),
    ("Amit Kushwaha",     "MCA",  "3", "2022-23", "Devendra Kushwaha","Male",   "Allahabad",   "9876543226", "2001-07-30"),
    ("Sunita Bhatt",      "BCA",  "5", "2022-23", "Gopal Bhatt",      "Female", "Dehradun",    "9876543227", "2003-04-18"),
]

# Fraction of total fees paid per student (0 = nothing, 1.0 = fully paid)
PAYMENT_FRACTIONS = [
    0,      # Aarav — not paid
    0.25,   # Priya — 1st installment
    0.50,   # Rohan — 2 installments
    1.00,   # Sneha — fully paid
    0.75,   # Karan — 3 installments
    0.25,   # Pooja
    1.00,   # Arjun — fully paid
    0.50,   # Nisha
    0,      # Vikram — not paid
    1.00,   # Deepika — fully paid
    0.25,   # Ankit
    0,      # Kavya — not paid
    0.75,   # Harsh
    0.50,   # Megha
    0.25,   # Sameer
    1.00,   # Ritika — fully paid
    0.50,   # Amit
    0.75,   # Sunita
]


def seed_dummy():
    existing = get_all_students()
    existing_names = {s["name"] for s in existing}

    created = 0
    skipped = 0

    for i, (name, course, sem, batch, father, gender, city, mobile, dob) in enumerate(STUDENTS):
        if name in existing_names:
            print("  Skip (exists): " + name)
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
            "totalFees": 0,
        })

        sid = student["id"]
        total = int(student["totalFees"])
        fraction = PAYMENT_FRACTIONS[i]

        if total == 0:
            print("  WARNING: " + name + " (" + sid + ") -- course fee not found, skipping payment")
            created += 1
            continue

        if fraction > 0:
            pay_amount = round(total * fraction)
            pay_amount = min(pay_amount, int(student["due"]))
            if pay_amount > 0:
                collect_fee(sid, pay_amount, "Cash")
                print("  Created: " + name + " (" + sid + ") -- paid Rs." + str(pay_amount) + " of Rs." + str(total))
            else:
                print("  Created: " + name + " (" + sid + ") -- Rs.0 paid")
        else:
            print("  Created: " + name + " (" + sid + ") -- Rs.0 paid")

        created += 1

    print("\nDone! Created " + str(created) + " students, skipped " + str(skipped) + " existing.")


if __name__ == "__main__":
    seed_dummy()
