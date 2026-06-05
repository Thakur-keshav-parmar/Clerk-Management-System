#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Upload EduNova project to EC2 (Linux / Mac)
#  Run from project root: bash deploy/upload_to_ec2.sh
# ─────────────────────────────────────────────────────────────

read -p "Enter EC2 Public IP: " EC2_IP
KEY_FILE="clerk-keypair.pem"

echo ""
echo "Uploading project to ec2-user@$EC2_IP..."
echo ""

# Fix key permissions
chmod 400 $KEY_FILE

# Upload everything except cache, legacy and local .env
rsync -avz --progress \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '_legacy' \
  --exclude 'backend/.env' \
  --exclude 'backend/data/db.json' \
  assets/ backend/ index.html \
  -e "ssh -i $KEY_FILE" \
  ec2-user@$EC2_IP:/home/ec2-user/clerk/

echo ""
echo "Upload complete!"
echo ""
echo "Next steps:"
echo "  ssh -i $KEY_FILE ec2-user@$EC2_IP"
echo "  cd /home/ec2-user/clerk/backend"
echo "  pip3 install -r requirements.txt"
echo "  cp .env.aws.example .env && nano .env"
echo "  uvicorn main:app --host 0.0.0.0 --port 8000"
