from pydantic import BaseModel
from typing import Optional

class PaymentCreate(BaseModel):
    studentId: str
    amount: int
    method: str = "Cash"
    paymentDate: Optional[str] = None
    razorpayData: Optional[dict] = None
