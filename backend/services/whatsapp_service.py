from twilio.rest import Client
from config.settings import TWILIO_SID, TWILIO_TOKEN, TWILIO_WHATSAPP_FROM


def _normalise_phone(phone: str) -> str:
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+"):
        return phone
    if phone.startswith("0"):
        phone = phone[1:]
    return "+91" + phone


def send_otp(phone: str, otp: str) -> None:
    to = "whatsapp:" + _normalise_phone(phone)
    client = Client(TWILIO_SID, TWILIO_TOKEN)
    client.messages.create(
        from_=TWILIO_WHATSAPP_FROM,
        to=to,
        body=(
            f"Your EduNova password reset OTP is: *{otp}*\n"
            "Valid for 10 minutes. Do not share this with anyone."
        ),
    )
