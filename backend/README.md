# College Clerk System — Backend

## Quick Start (Offline)

### 1. Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Set up environment
```bash
cp .env.example .env
# STORAGE=local is already set — no AWS needed
```

### 3. Seed the database
```bash
python scripts/seed.py
```

### 4. Run the server
```bash
uvicorn main:app --reload --port 8000
```

Visit: http://localhost:8000/docs — interactive API docs (Swagger UI)

### Login credentials
- Username: `admin`
- Password: `admin123`

---

## Switching to AWS (later)

1. Create a DynamoDB table named `clerk_app` with:
   - Partition key: `PK` (String)
   - Sort key: `SK` (String)
   - GSI named `GSI1` with `GSI1_PK` (String) and `GSI1_SK` (String)

2. Attach an IAM role to your EC2 with DynamoDB + S3 permissions

3. Update `.env`:
```
STORAGE=aws
AWS_REGION=ap-south-1
DYNAMO_TABLE=clerk_app
```

4. Run seed script once to populate DynamoDB:
```bash
python scripts/seed.py
```

No code changes needed — same codebase works for both local and AWS.
