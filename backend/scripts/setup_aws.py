"""
College Clerk System — Full AWS Setup Script
============================================
This script automatically creates everything needed on AWS:

  1. IAM Policy    (CollegeClerkPolicy)
  2. IAM Role      (CollegeClerkRole)  — for EC2 instance
  3. Instance Profile (CollegeClerkProfile)
  4. DynamoDB Table  (clerk_app)  — single table with GSI
  5. S3 Bucket       (clerk-app-files-<account_id>)
  6. EC2 Security Group (clerk-sg)
  7. EC2 t2.micro Instance  — Amazon Linux 2023, auto-installs app

Requirements before running:
  - Python + boto3 installed  (pip install boto3)
  - AWS CLI configured        (aws configure)
  - IAM user must have AdministratorAccess or the permissions listed in README

Run:
  python scripts/setup_aws.py
"""

import boto3, json, time, sys, os
from botocore.exceptions import ClientError

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ─────────────────────────────────────────────
# CONFIG — change these if needed
# ─────────────────────────────────────────────
REGION         = "ap-south-1"
TABLE_NAME     = "clerk_app"
POLICY_NAME    = "CollegeClerkPolicy"
ROLE_NAME      = "CollegeClerkRole"
PROFILE_NAME   = "CollegeClerkProfile"
SG_NAME        = "clerk-sg"
KEY_PAIR_NAME  = "clerk-keypair"       # SSH key — saved as clerk-keypair.pem
EC2_PORT       = 8000                  # FastAPI runs on this port
SSH_PORT       = 22

# ─────────────────────────────────────────────
# COLOUR HELPERS
# ─────────────────────────────────────────────
def ok(msg):   print(f"  [OK] {msg}")
def skip(msg): print(f"  [SKIP] {msg}")
def err(msg):  print(f"  [ERROR] {msg}"); sys.exit(1)
def info(msg): print(f"  [INFO] {msg}")
def head(msg): print(f"\n{'='*55}\n  {msg}\n{'='*55}")

# ─────────────────────────────────────────────
# AWS CLIENTS
# ─────────────────────────────────────────────
session  = boto3.Session(region_name=REGION)
iam      = session.client("iam")
dynamodb = session.client("dynamodb")
s3       = session.client("s3")
ec2      = session.client("ec2")
sts      = session.client("sts")

# ─────────────────────────────────────────────
# 0. VERIFY CREDENTIALS
# ─────────────────────────────────────────────
head("0. Verifying AWS credentials")
try:
    identity = sts.get_caller_identity()
    ACCOUNT_ID = identity["Account"]
    ok(f"Logged in as: {identity['Arn']}")
    ok(f"Account ID  : {ACCOUNT_ID}")
    ok(f"Region      : {REGION}")
except Exception as e:
    err(f"AWS credentials not found. Run 'aws configure' first.\n     {e}")

S3_BUCKET = f"clerk-app-files-{ACCOUNT_ID}"

# ─────────────────────────────────────────────
# 1. IAM POLICY
# ─────────────────────────────────────────────
head("1. Creating IAM Policy")

POLICY_DOC = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DynamoDBAccess",
            "Effect": "Allow",
            "Action": [
                "dynamodb:CreateTable",
                "dynamodb:DescribeTable",
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:BatchGetItem",
                "dynamodb:BatchWriteItem"
            ],
            "Resource": [
                f"arn:aws:dynamodb:{REGION}:{ACCOUNT_ID}:table/{TABLE_NAME}",
                f"arn:aws:dynamodb:{REGION}:{ACCOUNT_ID}:table/{TABLE_NAME}/index/*"
            ]
        },
        {
            "Sid": "S3Access",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                f"arn:aws:s3:::{S3_BUCKET}",
                f"arn:aws:s3:::{S3_BUCKET}/*"
            ]
        }
    ]
}

POLICY_ARN = None
try:
    resp = iam.create_policy(
        PolicyName=POLICY_NAME,
        PolicyDocument=json.dumps(POLICY_DOC),
        Description="Policy for College Clerk System — DynamoDB + S3"
    )
    POLICY_ARN = resp["Policy"]["Arn"]
    ok(f"Policy created: {POLICY_ARN}")
except ClientError as e:
    if e.response["Error"]["Code"] == "EntityAlreadyExists":
        POLICY_ARN = f"arn:aws:iam::{ACCOUNT_ID}:policy/{POLICY_NAME}"
        skip(f"Policy already exists: {POLICY_ARN}")
    else:
        err(str(e))

# ─────────────────────────────────────────────
# 2. IAM ROLE
# ─────────────────────────────────────────────
head("2. Creating IAM Role for EC2")

TRUST_POLICY = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "ec2.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]
}

try:
    iam.create_role(
        RoleName=ROLE_NAME,
        AssumeRolePolicyDocument=json.dumps(TRUST_POLICY),
        Description="IAM Role for College Clerk EC2 instance"
    )
    ok(f"Role created: {ROLE_NAME}")
except ClientError as e:
    if e.response["Error"]["Code"] == "EntityAlreadyExists":
        skip(f"Role already exists: {ROLE_NAME}")
    else:
        err(str(e))

# Attach policy to role
try:
    iam.attach_role_policy(RoleName=ROLE_NAME, PolicyArn=POLICY_ARN)
    ok(f"Policy attached to role")
except ClientError as e:
    skip(f"Policy may already be attached: {e.response['Error']['Code']}")

# ─────────────────────────────────────────────
# 3. INSTANCE PROFILE
# ─────────────────────────────────────────────
head("3. Creating EC2 Instance Profile")

try:
    iam.create_instance_profile(InstanceProfileName=PROFILE_NAME)
    ok(f"Instance profile created: {PROFILE_NAME}")
except ClientError as e:
    if e.response["Error"]["Code"] == "EntityAlreadyExists":
        skip(f"Instance profile already exists: {PROFILE_NAME}")
    else:
        err(str(e))

try:
    iam.add_role_to_instance_profile(
        InstanceProfileName=PROFILE_NAME,
        RoleName=ROLE_NAME
    )
    ok(f"Role added to instance profile")
except ClientError as e:
    skip(f"Role may already be in profile: {e.response['Error']['Code']}")

info("Waiting 10s for IAM to propagate...")
time.sleep(10)

# ─────────────────────────────────────────────
# 4. DYNAMODB TABLE
# ─────────────────────────────────────────────
head("4. Creating DynamoDB Table")

try:
    dynamodb.create_table(
        TableName=TABLE_NAME,
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "PK",      "AttributeType": "S"},
            {"AttributeName": "SK",      "AttributeType": "S"},
            {"AttributeName": "GSI1_PK", "AttributeType": "S"},
            {"AttributeName": "GSI1_SK", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[{
            "IndexName": "GSI1",
            "KeySchema": [
                {"AttributeName": "GSI1_PK", "KeyType": "HASH"},
                {"AttributeName": "GSI1_SK", "KeyType": "RANGE"},
            ],
            "Projection": {"ProjectionType": "ALL"},
        }],
        BillingMode="PAY_PER_REQUEST",
        Tags=[
            {"Key": "Project",     "Value": "CollegeClerkSystem"},
            {"Key": "Environment", "Value": "Production"},
        ]
    )
    info("Waiting for table to become ACTIVE...")
    waiter = dynamodb.get_waiter("table_exists")
    waiter.wait(TableName=TABLE_NAME)
    ok(f"DynamoDB table '{TABLE_NAME}' is ACTIVE")
except ClientError as e:
    if e.response["Error"]["Code"] == "ResourceInUseException":
        skip(f"Table '{TABLE_NAME}' already exists")
    else:
        err(str(e))

# ─────────────────────────────────────────────
# 5. S3 BUCKET
# ─────────────────────────────────────────────
head("5. Creating S3 Bucket for File Storage")

try:
    if REGION == "us-east-1":
        s3.create_bucket(Bucket=S3_BUCKET)
    else:
        s3.create_bucket(
            Bucket=S3_BUCKET,
            CreateBucketConfiguration={"LocationConstraint": REGION}
        )
    # Block all public access (private bucket — only EC2 role can access)
    s3.put_public_access_block(
        Bucket=S3_BUCKET,
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True
        }
    )
    ok(f"S3 bucket created: {S3_BUCKET}")
    ok("Public access blocked (private bucket)")
except ClientError as e:
    code = e.response["Error"]["Code"]
    if code in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
        skip(f"Bucket already exists: {S3_BUCKET}")
    else:
        err(str(e))

# ─────────────────────────────────────────────
# 6. EC2 KEY PAIR
# ─────────────────────────────────────────────
head("6. Creating EC2 Key Pair (SSH)")

PEM_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), f"{KEY_PAIR_NAME}.pem")

if os.path.exists(PEM_FILE):
    skip(f"Key pair file already exists: {PEM_FILE}")
else:
    try:
        kp = ec2.create_key_pair(KeyName=KEY_PAIR_NAME, KeyType="rsa", KeyFormat="pem")
        with open(PEM_FILE, "w") as f:
            f.write(kp["KeyMaterial"])
        # Restrict permissions (required for SSH on Linux/Mac)
        try:
            os.chmod(PEM_FILE, 0o400)
        except Exception:
            pass
        ok(f"Key pair saved: {PEM_FILE}")
        info("KEEP THIS FILE SAFE — you need it to SSH into your EC2 instance")
    except ClientError as e:
        if e.response["Error"]["Code"] == "InvalidKeyPair.Duplicate":
            skip(f"Key pair '{KEY_PAIR_NAME}' already exists in AWS (but .pem file missing — re-create manually if needed)")
        else:
            err(str(e))

# ─────────────────────────────────────────────
# 7. SECURITY GROUP
# ─────────────────────────────────────────────
head("7. Creating Security Group")

SG_ID = None

# Check if already exists
try:
    existing_sgs = ec2.describe_security_groups(
        Filters=[{"Name": "group-name", "Values": [SG_NAME]}]
    )
    if existing_sgs["SecurityGroups"]:
        SG_ID = existing_sgs["SecurityGroups"][0]["GroupId"]
        skip(f"Security group already exists: {SG_ID}")
except Exception:
    pass

if not SG_ID:
    try:
        sg_resp = ec2.create_security_group(
            GroupName=SG_NAME,
            Description="Security group for College Clerk System EC2"
        )
        SG_ID = sg_resp["GroupId"]
        ok(f"Security group created: {SG_ID}")

        ec2.authorize_security_group_ingress(
            GroupId=SG_ID,
            IpPermissions=[
                {   # SSH
                    "IpProtocol": "tcp", "FromPort": SSH_PORT, "ToPort": SSH_PORT,
                    "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "SSH"}]
                },
                {   # FastAPI port
                    "IpProtocol": "tcp", "FromPort": EC2_PORT, "ToPort": EC2_PORT,
                    "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "FastAPI"}]
                },
                {   # HTTP
                    "IpProtocol": "tcp", "FromPort": 80, "ToPort": 80,
                    "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "HTTP"}]
                }
            ]
        )
        ok(f"Inbound rules added: SSH(22), HTTP(80), App({EC2_PORT})")
    except ClientError as e:
        err(str(e))

# ─────────────────────────────────────────────
# 8. EC2 INSTANCE
# ─────────────────────────────────────────────
head("8. Launching EC2 t2.micro Instance")

# Amazon Linux 2023 AMI for ap-south-1
# This is fetched dynamically so it's always the latest
def get_latest_al2023_ami():
    try:
        resp = ec2.describe_images(
            Owners=["amazon"],
            Filters=[
                {"Name": "name",         "Values": ["al2023-ami-2023*-kernel-*-x86_64"]},
                {"Name": "architecture", "Values": ["x86_64"]},
                {"Name": "state",        "Values": ["available"]},
            ]
        )
        images = sorted(resp["Images"], key=lambda x: x["CreationDate"], reverse=True)
        return images[0]["ImageId"] if images else "ami-0f58b397bc5c1f2e8"
    except Exception:
        return "ami-0f58b397bc5c1f2e8"  # fallback ap-south-1 Amazon Linux 2023

AMI_ID = get_latest_al2023_ami()
info(f"Using AMI: {AMI_ID} (Amazon Linux 2023)")

# User data script — runs automatically on first boot
USER_DATA = f"""#!/bin/bash
set -e

# Update system
dnf update -y

# Install Python 3.11 and pip
dnf install -y python3.11 python3.11-pip git

# Set python3 default
alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Create app directory
mkdir -p /home/ec2-user/clerk
cd /home/ec2-user/clerk

# Create .env file
cat > /home/ec2-user/clerk/backend/.env << 'ENVEOF'
STORAGE=aws
JWT_SECRET=change-this-secret-before-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=8
AWS_REGION={REGION}
DYNAMO_TABLE={TABLE_NAME}
S3_BUCKET={S3_BUCKET}
ALLOWED_ORIGIN=*
ENVEOF

# Install Python dependencies (will be run after you upload your code)
echo "AWS setup complete. Upload your code to /home/ec2-user/clerk/ and run:"
echo "  cd /home/ec2-user/clerk/backend"
echo "  pip3.11 install -r requirements.txt"
echo "  python3.11 scripts/seed.py"
echo "  uvicorn main:app --host 0.0.0.0 --port {EC2_PORT}"
"""

# Get instance profile ARN
try:
    profile_resp = iam.get_instance_profile(InstanceProfileName=PROFILE_NAME)
    PROFILE_ARN  = profile_resp["InstanceProfile"]["Arn"]
except Exception as e:
    err(f"Could not get instance profile: {e}")

try:
    instance_resp = ec2.run_instances(
        ImageId=AMI_ID,
        InstanceType="t3.micro",
        KeyName=KEY_PAIR_NAME,
        SecurityGroupIds=[SG_ID],
        MinCount=1,
        MaxCount=1,
        IamInstanceProfile={"Arn": PROFILE_ARN},
        UserData=USER_DATA,
        TagSpecifications=[{
            "ResourceType": "instance",
            "Tags": [
                {"Key": "Name",    "Value": "CollegeClerkSystem"},
                {"Key": "Project", "Value": "CollegeClerkSystem"}
            ]
        }]
    )

    instance_id = instance_resp["Instances"][0]["InstanceId"]
    ok(f"EC2 instance launched: {instance_id}")
    info("Waiting for instance to be running (this takes ~1 min)...")

    waiter = ec2.get_waiter("instance_running")
    waiter.wait(InstanceIds=[instance_id])

    desc = ec2.describe_instances(InstanceIds=[instance_id])
    public_ip  = desc["Reservations"][0]["Instances"][0].get("PublicIpAddress", "pending")
    public_dns = desc["Reservations"][0]["Instances"][0].get("PublicDnsName",   "pending")

    ok(f"Instance is RUNNING!")
    ok(f"Public IP  : {public_ip}")
    ok(f"Public DNS : {public_dns}")

except ClientError as e:
    err(str(e))

# ─────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────
print(f"""
\033[1m{'═'*55}
  ✅  AWS SETUP COMPLETE
{'═'*55}\033[0m

  IAM Policy     : {POLICY_NAME}
  IAM Role       : {ROLE_NAME}
  DynamoDB Table : {TABLE_NAME}  (region: {REGION})
  S3 Bucket      : {S3_BUCKET}
  EC2 Instance   : {instance_id}
  Public IP      : {public_ip}
  SSH Key        : {PEM_FILE}

\033[1m  NEXT STEPS:\033[0m
  1. Upload your project to EC2:
     scp -i {KEY_PAIR_NAME}.pem -r . ec2-user@{public_ip}:/home/ec2-user/clerk

  2. SSH into EC2:
     ssh -i {KEY_PAIR_NAME}.pem ec2-user@{public_ip}

  3. Install & run:
     cd /home/ec2-user/clerk/backend
     pip3.11 install -r requirements.txt
     python3.11 scripts/seed.py
     uvicorn main:app --host 0.0.0.0 --port {EC2_PORT}

  4. Open in browser:
     http://{public_ip}:{EC2_PORT}
     http://{public_ip}:{EC2_PORT}/docs  ← API docs

\033[93m  ⚠️  Remember to change JWT_SECRET in .env before going live!\033[0m
""")
