"""
Seed script — creates default admin and teacher users, and default IT courses.
Run once on first deploy: python scripts/seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import repo
from services.auth_service import hash_password
from services.course_service import add_course, get_all_courses

DEFAULT_USERS = [
    {"username": "admin",   "password": "admin123",   "name": "Admin",   "role": "admin"},
    {"username": "teacher", "password": "teacher123", "name": "Teacher", "role": "teacher"},
]

DEFAULT_COURSES = [
    {"code": "Python",   "name": "Python Programming",      "duration": 1, "semesters": 2},
    {"code": "WebDev",   "name": "Web Development",         "duration": 1, "semesters": 2},
    {"code": "DataSci",  "name": "Data Science",            "duration": 1, "semesters": 2},
    {"code": "ML",       "name": "Machine Learning",        "duration": 1, "semesters": 2},
    {"code": "Java",     "name": "Java Programming",        "duration": 1, "semesters": 2},
    {"code": "Android",  "name": "Android Development",     "duration": 1, "semesters": 2},
    {"code": "UIUX",     "name": "UI/UX Design",            "duration": 1, "semesters": 2},
    {"code": "CySec",    "name": "Cybersecurity Essentials","duration": 1, "semesters": 2},
]


def seed():
    print("Seeding database...")

    # Users
    for u in DEFAULT_USERS:
        existing = repo.get_item(f"USER#{u['username']}", "#META")
        if not existing:
            repo.put_item({
                "PK": f"USER#{u['username']}", "SK": "#META",
                "GSI1_PK": "ALL#USERS", "GSI1_SK": f"USER#{u['username']}",
                "username": u["username"],
                "password_hash": hash_password(u["password"]),
                "name": u["name"],
                "role": u["role"]
            })
            print(f"  Created user: {u['username']} / {u['password']}")
        else:
            print(f"  User {u['username']} already exists")

    # Courses
    existing_codes = [c["code"] for c in get_all_courses()]
    for c in DEFAULT_COURSES:
        if c["code"] not in existing_codes:
            add_course(c["code"], c["name"], c["duration"], c["semesters"])
            print(f"  Created course: {c['code']} -- {c['name']}")
        else:
            print(f"  Course {c['code']} already exists")

    print("\nSeeding complete!")
    print("   admin   / admin123")
    print("   teacher / teacher123")


if __name__ == "__main__":
    seed()
