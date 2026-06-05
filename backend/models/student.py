from pydantic import BaseModel
from typing import Optional

class StudentCreate(BaseModel):
    name: str
    course: str
    contact: str = ""
    address: str = ""
    dob: str = ""
    admissionDate: str = ""
    fatherName: str = ""
    fatherMobile: str = ""
    aadhaar: str = ""
    feeType: str = "monthly"
    waiverAmount: int = 0
    photo: Optional[str] = None
    manualRollNumber: Optional[str] = None

class StudentUpdate(BaseModel):
    name: str = ""
    contact: str = ""
    address: str = ""
    dob: str = ""
    admissionDate: str = ""
    fatherName: str = ""
    fatherMobile: str = ""
    aadhaar: str = ""
    photo: Optional[str] = None
    status: str = ""
    breakFromDate: str = ""
    breakRemarks: str = ""
    leftDate: str = ""
    passoutDate: str = ""
