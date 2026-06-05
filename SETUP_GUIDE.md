# Clerk Management System — Setup Guide

A full-stack coaching institute management system (fees, students, clearance, WhatsApp reminders).
Built with: Python (FastAPI) · AWS DynamoDB · AWS Lambda · Razorpay · Twilio WhatsApp · PHP (legacy XAMPP version)

---

## Two Ways to Run

| Mode | Stack | Best For |
|------|-------|---------|
| **Local (XAMPP)** | PHP + MySQL | Quick local testing, no cloud needed |
| **Cloud (AWS)** | Python + DynamoDB | Production deployment |

---

## Option A — Local XAMPP Setup

### Requirements
- XAMPP 7.4+ (PHP 8+): [apachefriends.org](https://www.apachefriends.org)
- Windows PC

### Steps
1. Download and extract this project into: `C:\xampp\htdocs\clerk-management-system\`
2. Start XAMPP → Start **Apache** and **MySQL**
3. Open browser → go to: `http://localhost/clerk-management-system/install.php`
4. The installer will create the database and run all migrations automatically
5. After install, open: `http://localhost/clerk-management-system/`
6. **Delete `install.php` after setup** (security)

### Default Login (change immediately after first login)
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Teacher | `teacher` | `teacher123` |

---

## Option B — AWS Cloud Setup

### Requirements
- AWS Account
- Python 3.9+
- AWS CLI installed

### Step 1 — Create `.env` file

Copy `backend/.env.example` to `backend/.env` and fill in your values:

```env
# JWT
JWT_SECRET=YOUR_LONG_RANDOM_SECRET         # generate: python -c "import secrets; print(secrets.token_hex(32))"

# AWS
AWS_REGION=YOUR_AWS_REGION                 # e.g. ap-south-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY

# Razorpay (optional - for payments)
RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET

# Twilio (optional - for WhatsApp reminders)
TWILIO_ACCOUNT_SID=YOUR_TWILIO_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_TOKEN
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Step 2 — Set Up AWS Infrastructure

```bash
cd backend
pip install -r requirements.txt
python scripts/setup_aws.py
```

This creates all DynamoDB tables automatically.

### Step 3 — Run Backend

```bash
cd backend
python main.py
# API available at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### Step 4 — Set Admin Credentials

After setup, update `backend/data/db.json`:
- Find `"role": "admin"` entry
- Set `"phone"` to your admin phone number
- Generate password hash: `python -c "import hashlib; print(hashlib.sha256('YOUR_PASSWORD'.encode()).hexdigest())"`
- Set `"password_hash"` to the generated hash

---

## Placeholder Reference Table

| Placeholder | File | What to put |
|---|---|---|
| `YOUR_LONG_RANDOM_SECRET` | `backend/.env` | Random 64-char hex string |
| `YOUR_AWS_REGION` | `backend/.env` | e.g. `ap-south-1` |
| `YOUR_AWS_ACCESS_KEY` | `backend/.env` | AWS IAM Access Key ID |
| `YOUR_AWS_SECRET_KEY` | `backend/.env` | AWS IAM Secret Access Key |
| `YOUR_RAZORPAY_KEY_ID` | `backend/.env` | Razorpay Key ID (`rzp_test_...`) |
| `YOUR_RAZORPAY_KEY_SECRET` | `backend/.env` | Razorpay Key Secret |
| `YOUR_TWILIO_SID` | `backend/.env` | Twilio Account SID (`AC...`) |
| `YOUR_TWILIO_TOKEN` | `backend/.env` | Twilio Auth Token |
| `YOUR_ADMIN_PHONE` | `backend/data/db.json` | Admin login phone number |
| `YOUR_ADMIN_PASSWORD_HASH` | `backend/data/db.json` | SHA-256 hash of your password |

---

## Services You Need

| Service | Purpose | Free? |
|---------|---------|-------|
| AWS Account | DynamoDB + Lambda hosting | Free tier |
| Razorpay | Payment collection | Free (test mode) |
| Twilio | WhatsApp fee reminders | Free (sandbox) |
