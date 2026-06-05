import os
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET    = os.getenv("JWT_SECRET", "change-this-secret-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "8"))

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")

STORAGE          = os.getenv("STORAGE", "aws")
AWS_REGION       = os.getenv("AWS_REGION", "ap-south-1")
DYNAMO_TABLE     = os.getenv("DYNAMO_TABLE", "clerk_app")
DYNAMO_ENDPOINT  = os.getenv("DYNAMO_ENDPOINT", "")

TWILIO_SID           = os.getenv("TWILIO_SID", "")
TWILIO_TOKEN         = os.getenv("TWILIO_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

# Data directory for JSON storage (relative to this file's parent directory)
LOCAL_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
