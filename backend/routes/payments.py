from fastapi import APIRouter, Depends, HTTPException
from models.payment import PaymentCreate
from services import payment_service
from middleware.auth_middleware import require_auth
from config.settings import RAZORPAY_KEY_ID

router = APIRouter(prefix="/api/payments", tags=["payments"])

@router.get("/razorpay-key")
def get_razorpay_key(user=Depends(require_auth)):
    return {"key_id": RAZORPAY_KEY_ID}

@router.get("")
def list_payments(user=Depends(require_auth)):
    return payment_service.get_all_payments_v2()

@router.post("")
def collect_fee(body: PaymentCreate, user=Depends(require_auth)):
    try:
        txn = payment_service.collect_fee(
            body.studentId, body.amount, body.method,
            payment_date=body.paymentDate,
            rzp_data=body.razorpayData
        )
        if not txn:
            raise HTTPException(404, "Student not found")
        return txn
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("/student/{sid}")
def student_payments(sid: str, user=Depends(require_auth)):
    return payment_service.get_student_payments(sid)
