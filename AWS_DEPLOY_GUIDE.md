# EduNova — Complete AWS Deployment Guide
### College Clerk Fee Management System

> This guide covers everything needed to deploy EduNova on AWS from scratch.  
> Works for: manual deployment, AI-assisted deployment, or handing off to another developer.

---

## Table of Contents
1. [What You Need Before Starting](#1-what-you-need-before-starting)
2. [Project Structure](#2-project-structure)
3. [Option A — Automatic Setup (Recommended)](#3-option-a--automatic-setup-one-script-does-everything)
4. [Option B — Manual Step-by-Step](#4-option-b--manual-step-by-step)
5. [Upload Files to EC2](#5-upload-files-to-ec2)
6. [Configure & Start the App](#6-configure--start-the-app-on-ec2)
7. [Restore Data from Backup](#7-restore-data-from-backup)
8. [Switch from Local to DynamoDB](#8-switch-from-local-storage-to-dynamodb)
9. [Verify Everything Works](#9-verify-everything-works)
10. [Ongoing Management](#10-ongoing-management)
11. [Troubleshooting](#11-troubleshooting)
12. [Full Architecture Summary](#12-full-architecture-summary)

---

## 1. What You Need Before Starting

### On your computer:
- Python 3.8+ installed → [python.org](https://python.org)
- AWS CLI installed → [Install guide](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
- `boto3` installed: `pip install boto3`
- `scp` / `ssh` available (built into Windows 10+, Mac, Linux)

### AWS Account:
- An AWS account with an IAM user that has **AdministratorAccess** (or at minimum: EC2, DynamoDB, IAM, S3 full access)
- AWS CLI configured with that user's credentials

### Configure AWS CLI (run once):
```bash
aws configure
```
Enter:
- **AWS Access Key ID** — from your IAM user
- **AWS Secret Access Key** — from your IAM user
- **Default region** → `ap-south-1` (Mumbai — closest to India)
- **Default output format** → `json`

Verify it works:
```bash
aws sts get-caller-identity
```
You should see your Account ID and ARN.

---

## 2. Project Structure

```
EduNova/
├── index.html                   ← Frontend SPA (single page app)
├── assets/
│   ├── css/styles.css
│   └── js/                      ← All frontend JavaScript modules
│       ├── app.js, auth.js, data.js, router.js
│       ├── students.js, students-form.js
│       ├── payments.js, clearance.js
│       ├── dues.js, dashboard.js, reports.js
│       ├── reminders.js, admin.js, settings.js
│       └── utils.js
├── backend/
│   ├── main.py                  ← FastAPI app entry point
│   ├── requirements.txt         ← Python dependencies
│   ├── .env                     ← Your secrets (never commit this)
│   ├── .env.aws.example         ← Template for AWS deployment
│   ├── .env.example             ← Template for local development
│   ├── config/
│   │   └── settings.py          ← Reads all env vars
│   ├── db/
│   │   ├── __init__.py          ← Auto-selects local or DynamoDB
│   │   ├── base.py              ← Abstract repository interface
│   │   ├── local_db.py          ← JSON file storage (local mode)
│   │   └── dynamo_db.py         ← AWS DynamoDB storage (aws mode)
│   ├── data/
│   │   └── db.json              ← Local database (backup/fallback)
│   ├── models/                  ← Pydantic request/response models
│   ├── routes/                  ← API route handlers (12 modules)
│   ├── services/                ← Business logic (8 modules)
│   ├── middleware/
│   │   └── auth_middleware.py   ← JWT authentication
│   └── scripts/
│       ├── setup_aws.py         ← Creates ALL AWS resources automatically
│       ├── import_to_dynamo.py  ← Imports db.json → DynamoDB
│       └── seed.py              ← Seeds initial admin user
├── deploy/
│   ├── upload_to_ec2.bat        ← Windows: upload files to EC2
│   ├── upload_to_ec2.sh         ← Linux/Mac: upload files to EC2
│   └── ec2_startup.sh           ← Run on EC2 to install & start app
└── AWS_DEPLOY_GUIDE.md          ← This file
```

---

## 3. Option A — Automatic Setup (One Script Does Everything)

This is the **recommended** approach. One Python script creates all AWS resources automatically.

### Step 1 — Run the setup script
```bash
cd backend
python scripts/setup_aws.py
```

This script will:
- ✅ Create IAM Policy (`CollegeClerkPolicy`) — DynamoDB + S3 permissions
- ✅ Create IAM Role (`CollegeClerkRole`) — for EC2 to access DynamoDB without credentials
- ✅ Create EC2 Instance Profile (`CollegeClerkProfile`)
- ✅ Create DynamoDB table `clerk_app` with GSI
- ✅ Create S3 bucket for file storage
- ✅ Create EC2 key pair — saves as `clerk-keypair.pem`
- ✅ Create Security Group `clerk-sg` — opens ports 22, 80, 8000
- ✅ Launch EC2 `t3.micro` instance (Amazon Linux 2023)

At the end it prints your **EC2 Public IP** and the next steps.

### Step 2 — Note the output
```
  Public IP  : 13.234.xxx.xxx
  SSH Key    : clerk-keypair.pem
```
Save this IP — you'll use it in all the steps below.

### Step 3 — Continue to [Section 5: Upload Files](#5-upload-files-to-ec2)

---

## 4. Option B — Manual Step-by-Step

Use this if you prefer to do each step yourself via the AWS Console or CLI.

### Step 1 — Create DynamoDB Table

**AWS Console:**
1. Go to AWS Console → DynamoDB → Create Table
2. Table name: `clerk_app`
3. Partition key: `PK` (String)
4. Sort key: `SK` (String)
5. Customize settings → Add Global Secondary Index:
   - Index name: `GSI1`
   - Partition key: `GSI1_PK` (String)
   - Sort key: `GSI1_SK` (String)
   - Projection: All
6. Billing: On-demand (recommended) or Provisioned (RCU=5, WCU=5)
7. Click Create

**AWS CLI:**
```bash
aws dynamodb create-table \
  --table-name clerk_app \
  --region ap-south-1 \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1_PK,AttributeType=S \
    AttributeName=GSI1_SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "GSI1",
      "KeySchema": [
        {"AttributeName":"GSI1_PK","KeyType":"HASH"},
        {"AttributeName":"GSI1_SK","KeyType":"RANGE"}
      ],
      "Projection": {"ProjectionType":"ALL"}
    }
  ]'
```

### Step 2 — Launch EC2 Instance

**AWS Console:**
1. Go to EC2 → Launch Instance
2. Name: `CollegeClerkSystem`
3. AMI: Amazon Linux 2023
4. Instance type: `t3.micro` (free tier eligible)
5. Key pair: Create new → name `clerk-keypair` → download `.pem` file
6. Security group: Create new → name `clerk-sg`
   - Add rule: SSH (22) — from Anywhere
   - Add rule: Custom TCP (8000) — from Anywhere
   - Add rule: HTTP (80) — from Anywhere
7. IAM instance profile: Create one with DynamoDB full access, attach to instance
8. Launch

**AWS CLI:**
```bash
# Create key pair
aws ec2 create-key-pair \
  --key-name clerk-keypair \
  --region ap-south-1 \
  --query "KeyMaterial" --output text > clerk-keypair.pem
chmod 400 clerk-keypair.pem

# Create security group
SG_ID=$(aws ec2 create-security-group \
  --group-name clerk-sg \
  --description "EduNova Security Group" \
  --region ap-south-1 \
  --query "GroupId" --output text)

# Open ports
aws ec2 authorize-security-group-ingress --group-id $SG_ID --region ap-south-1 \
  --ip-permissions \
  '[{"IpProtocol":"tcp","FromPort":22,"ToPort":22,"IpRanges":[{"CidrIp":"0.0.0.0/0"}]},
    {"IpProtocol":"tcp","FromPort":8000,"ToPort":8000,"IpRanges":[{"CidrIp":"0.0.0.0/0"}]},
    {"IpProtocol":"tcp","FromPort":80,"ToPort":80,"IpRanges":[{"CidrIp":"0.0.0.0/0"}]}]'

# Launch t3.micro
aws ec2 run-instances \
  --image-id ami-0f58b397bc5c1f2e8 \
  --instance-type t3.micro \
  --key-name clerk-keypair \
  --security-group-ids $SG_ID \
  --region ap-south-1 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=CollegeClerkSystem}]' \
  --query "Instances[0].InstanceId" --output text
```

---

## 5. Upload Files to EC2

Once EC2 is running, upload the project files.

**Windows (double-click):**
```
deploy\upload_to_ec2.bat
```
Enter your EC2 IP when asked. Done.

**Linux / Mac (terminal):**
```bash
bash deploy/upload_to_ec2.sh
```

**Manual (any OS):**
```bash
# Replace 13.234.xxx.xxx with your EC2 IP
scp -i clerk-keypair.pem -r assets backend index.html \
    ec2-user@13.234.xxx.xxx:/home/ec2-user/clerk/
```

---

## 6. Configure & Start the App on EC2

### Step 1 — SSH into EC2
```bash
ssh -i clerk-keypair.pem ec2-user@13.234.xxx.xxx
```

### Step 2 — Run the startup script (easiest way)
```bash
bash /home/ec2-user/clerk/deploy/ec2_startup.sh
```
This installs Python, installs dependencies, creates the systemd service, and starts the app.

**OR do it manually:**

### Step 2 (manual) — Install dependencies
```bash
sudo dnf update -y
sudo dnf install -y python3.11 python3.11-pip
cd /home/ec2-user/clerk/backend
pip3.11 install -r requirements.txt
```

### Step 3 — Create .env file
```bash
cp .env.aws.example .env
nano .env
```

Fill in these values:
```
STORAGE=aws
AWS_REGION=ap-south-1
DYNAMO_TABLE=clerk_app
JWT_SECRET=<generate a random 32+ char string>
ALLOWED_ORIGIN=*
```

> **Generate a secure JWT secret:**
> ```bash
> python3.11 -c "import secrets; print(secrets.token_hex(32))"
> ```

### Step 4 — Start the app
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Step 5 — Start automatically on boot (systemd)
```bash
sudo nano /etc/systemd/system/edunova.service
```
Paste:
```ini
[Unit]
Description=EduNova FastAPI Application
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/clerk/backend
ExecStart=/usr/bin/python3.11 -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
EnvironmentFile=/home/ec2-user/clerk/backend/.env

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable edunova
sudo systemctl start edunova
```

---

## 7. Restore Data from Backup

If you have a `db.json` backup (from previous deployment), import it into DynamoDB:

**On EC2:**
```bash
# Upload db.json to EC2 first
scp -i clerk-keypair.pem backend/data/db.json \
    ec2-user@13.234.xxx.xxx:/home/ec2-user/clerk/backend/data/

# Then on EC2:
ssh -i clerk-keypair.pem ec2-user@13.234.xxx.xxx
cd /home/ec2-user/clerk/backend
python3.11 scripts/import_to_dynamo.py
```

**From your local machine (directly to DynamoDB):**
```bash
cd backend
python scripts/import_to_dynamo.py
```

> Note: The script auto-reads `backend/data/db.json` and imports all records into DynamoDB.

---

## 8. Switch from Local Storage to DynamoDB

The app has two storage modes controlled by one env variable:

| Mode | `STORAGE` value | Where data is stored |
|------|-----------------|----------------------|
| Local (default) | `local` | `backend/data/db.json` |
| AWS | `aws` | AWS DynamoDB `clerk_app` |

**To switch to AWS DynamoDB:** in your `.env`:
```
STORAGE=aws
```

**To switch back to local (offline):** in your `.env`:
```
STORAGE=local
```

That's it. No code changes needed.

---

## 9. Verify Everything Works

### Test the app is running:
```bash
curl http://13.234.xxx.xxx:8000/health
# Expected: {"status": "ok", "storage": "local"}
```

### Test login:
```bash
curl -X POST http://13.234.xxx.xxx:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Expected: {"token": "eyJ..."}
```

### Open in browser:
- App: `http://13.234.xxx.xxx:8000`
- API docs: `http://13.234.xxx.xxx:8000/docs`

### Default login credentials:
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| teacher | teacher123 | Teacher |

> **Change passwords immediately after first login!** Go to Admin → Users.

---

## 10. Ongoing Management

### Check app status:
```bash
sudo systemctl status edunova
```

### View live logs:
```bash
sudo journalctl -u edunova -f
```

### Restart after code update:
```bash
# 1. Upload new files
bash deploy/upload_to_ec2.bat   # Windows
bash deploy/upload_to_ec2.sh    # Linux/Mac

# 2. Restart the service
ssh -i clerk-keypair.pem ec2-user@13.234.xxx.xxx
sudo systemctl restart edunova
```

### Stop the app:
```bash
sudo systemctl stop edunova
```

### Backup DynamoDB to local db.json:
```bash
aws dynamodb scan --table-name clerk_app --region ap-south-1 \
  --output json > dynamo_backup_$(date +%Y%m%d).json
```

### Delete all AWS resources (to save money):
```bash
# Stop and terminate EC2
aws ec2 terminate-instances --instance-ids <instance-id> --region ap-south-1

# Delete DynamoDB table
aws dynamodb delete-table --table-name clerk_app --region ap-south-1

# Delete IAM role and policy
aws iam detach-role-policy --role-name CollegeClerkRole \
  --policy-arn arn:aws:iam::<account-id>:policy/CollegeClerkPolicy
aws iam delete-role --role-name CollegeClerkRole
aws iam delete-policy --policy-arn arn:aws:iam::<account-id>:policy/CollegeClerkPolicy
```

---

## 11. Troubleshooting

### "Connection refused" on port 8000
- Check the EC2 security group has port 8000 open
- Check the app is running: `sudo systemctl status edunova`
- Check for errors: `sudo journalctl -u edunova -n 50`

### "Permission denied" for SSH
- Run: `chmod 400 clerk-keypair.pem`
- Make sure you're using `ec2-user@<IP>` (not `root` or `ubuntu`)

### "ModuleNotFoundError"
- Run `pip3.11 install -r requirements.txt` again on EC2

### DynamoDB "ResourceNotFoundException"
- Check `DYNAMO_TABLE=clerk_app` in `.env`
- Check `AWS_REGION=ap-south-1` in `.env`
- Verify table exists: `aws dynamodb list-tables --region ap-south-1`

### DynamoDB "AccessDeniedException"
- The EC2 instance needs an IAM role with DynamoDB access
- Run `setup_aws.py` again — it creates and attaches the role automatically

### App works locally but not on EC2
- Make sure `STORAGE=aws` is set in `.env` on EC2
- Make sure EC2 has an IAM instance profile (run `setup_aws.py`)

### App crashes on startup
```bash
# Run directly to see the error
cd /home/ec2-user/clerk/backend
python3.11 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 12. Full Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                     │
│              http://13.234.xxx.xxx:8000                 │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP
                        ▼
┌─────────────────────────────────────────────────────────┐
│              AWS EC2 t3.micro (ap-south-1)              │
│              Amazon Linux 2023                          │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │   FastAPI (uvicorn, port 8000)                   │  │
│  │                                                  │  │
│  │   Routes: /api/auth  /api/students               │  │
│  │           /api/payments  /api/courses            │  │
│  │           /api/clearance  /api/dues              │  │
│  │           /api/reports  /api/reminders           │  │
│  │           /api/dashboard  /api/users             │  │
│  │                                                  │  │
│  │   Static: / → index.html (SPA frontend)          │  │
│  │           /assets/* → CSS, JS files              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Security Group: clerk-sg                              │
│  Ports open: 22 (SSH), 80 (HTTP), 8000 (App)           │
│  IAM Role: CollegeClerkRole → DynamoDB access          │
└───────────────────────┬─────────────────────────────────┘
                        │ AWS SDK (boto3)
                        ▼
┌─────────────────────────────────────────────────────────┐
│          AWS DynamoDB (ap-south-1)                      │
│          Table: clerk_app                               │
│                                                         │
│  Single-table design:                                   │
│  PK (HASH) + SK (RANGE)                                 │
│                                                         │
│  GSI1: GSI1_PK + GSI1_SK                               │
│                                                         │
│  Records:                                               │
│  USER#admin / #META       → admin user                  │
│  COURSE#MCA / #META       → course details             │
│  COURSE#MCA / FEE#1       → semester fee               │
│  STUDENT#EDU001 / #META   → student record             │
│  STUDENT#EDU001 / PAYMENT#TXN1001  → payment           │
└─────────────────────────────────────────────────────────┘

Optional integrations (configure in .env):
  Razorpay  → Online fee payments
  Twilio    → WhatsApp OTP for password reset
```

### Cost estimate (AWS free tier):
| Resource | Free Tier | After Free Tier |
|----------|-----------|-----------------|
| EC2 t3.micro | 750 hrs/month (1 yr) | ~$8/month |
| DynamoDB | 25 GB + 25 RCU/WCU free | <$1/month for this app |
| Data transfer | 15 GB free | Minimal |

**Total after free tier: ~$8–10/month**

---

*EduNova — College Clerk Fee Management System*  
*Built with: Python FastAPI + DynamoDB + Vanilla JS*
