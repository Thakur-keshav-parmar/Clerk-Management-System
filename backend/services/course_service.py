from db import repo

COURSE_FIELDS = ["code", "name", "duration", "duration_unit", "semesters", "monthly_fee", "yearly_fee"]

def _to_dict(item: dict) -> dict:
    return {k: item.get(k, 0 if k in ("monthly_fee", "yearly_fee", "duration", "semesters") else "") for k in COURSE_FIELDS}

def get_all_courses() -> list[dict]:
    items = repo.query_gsi("ALL#COURSES")
    return sorted([_to_dict(i) for i in items], key=lambda x: x["code"])

def get_course(code: str) -> dict | None:
    item = repo.get_item(f"COURSE#{code}", "#META")
    return _to_dict(item) if item else None

def add_course(code: str, name: str, duration: int, semesters: int,
               duration_unit: str = "years", monthly_fee: int = 0, yearly_fee: int = 0) -> dict:
    existing = repo.get_item(f"COURSE#{code}", "#META")
    if existing:
        raise ValueError(f"Course {code} already exists")
    item = {
        "PK": f"COURSE#{code}", "SK": "#META",
        "GSI1_PK": "ALL#COURSES", "GSI1_SK": f"COURSE#{code}",
        "code": code, "name": name, "duration": duration,
        "duration_unit": duration_unit, "semesters": semesters,
        "monthly_fee": monthly_fee, "yearly_fee": yearly_fee,
    }
    repo.put_item(item)
    repo.put_item({"PK": f"COURSE#{code}", "SK": "SUBJECTS", "list": []})
    repo.put_item({"PK": f"COURSE#{code}", "SK": "MSTCONFIG",
                   "totalMarks": 25, "passMarks": 12, "fineLow": 50, "fineAbsent": 100})
    return _to_dict(item)

def delete_course(code: str) -> bool:
    items = repo.query(f"COURSE#{code}")
    for item in items:
        repo.delete_item(item["PK"], item["SK"])
    return True

def get_fee_structure(code: str) -> dict:
    item = repo.get_item(f"COURSE#{code}", "#META")
    if not item:
        return {}
    return {"monthly_fee": item.get("monthly_fee", 0), "yearly_fee": item.get("yearly_fee", 0)}

def update_fee_structure(code: str, monthly_fee=None, yearly_fee=None) -> dict:
    item = repo.get_item(f"COURSE#{code}", "#META")
    if not item:
        return {}
    if monthly_fee is not None:
        item["monthly_fee"] = monthly_fee
    if yearly_fee is not None:
        item["yearly_fee"] = yearly_fee
    repo.put_item(item)
    return {"monthly_fee": item.get("monthly_fee", 0), "yearly_fee": item.get("yearly_fee", 0)}

def get_subjects(code: str) -> list[str]:
    item = repo.get_item(f"COURSE#{code}", "SUBJECTS")
    return item["list"] if item else []

def update_subjects(code: str, subjects: list[str]) -> list[str]:
    repo.put_item({"PK": f"COURSE#{code}", "SK": "SUBJECTS", "list": subjects})
    return subjects

def get_mst_config(code: str) -> dict:
    item = repo.get_item(f"COURSE#{code}", "MSTCONFIG")
    if not item:
        return {"totalMarks": 25, "passMarks": 12, "fineLow": 50, "fineAbsent": 100}
    return {k: item[k] for k in ["totalMarks", "passMarks", "fineLow", "fineAbsent"] if k in item}

def update_mst_config(code: str, config: dict) -> dict:
    item = {"PK": f"COURSE#{code}", "SK": "MSTCONFIG", **config}
    repo.put_item(item)
    return config
