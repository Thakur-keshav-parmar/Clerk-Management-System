from pydantic import BaseModel, field_validator
from typing import Optional

class CourseCreate(BaseModel):
    code: str
    name: str
    duration: int = 3
    duration_unit: str = "years"
    semesters: int = 6
    monthly_fee: int = 0
    yearly_fee: int = 0

    @field_validator("code")
    @classmethod
    def code_upper(cls, v):
        v = v.strip().upper()
        if not v.isalpha() or not (2 <= len(v) <= 10):
            raise ValueError("Code must be 2–10 letters only")
        return v

class FeeStructureUpdate(BaseModel):
    monthly_fee: Optional[int] = None
    yearly_fee: Optional[int] = None

class SubjectsUpdate(BaseModel):
    subjects: list[str]

class MSTConfigUpdate(BaseModel):
    totalMarks: int = 25
    passMarks: int = 12
    fineLow: int = 50
    fineAbsent: int = 100
