#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  EduNova EC2 Startup Script
#  Run this ONCE after SSH-ing into a fresh EC2 instance.
#  It installs Python, dependencies, and starts the app.
#
#  Usage (after uploading project files):
#    bash /home/ec2-user/clerk/deploy/ec2_startup.sh
# ─────────────────────────────────────────────────────────────
set -e

echo "=============================="
echo " EduNova EC2 Setup"
echo "=============================="

# 1. Update system packages
echo "[1/6] Updating system..."
sudo dnf update -y

# 2. Install Python 3.11
echo "[2/6] Installing Python 3.11..."
sudo dnf install -y python3.11 python3.11-pip

# 3. Install project dependencies
echo "[3/6] Installing Python dependencies..."
cd /home/ec2-user/clerk/backend
pip3.11 install -r requirements.txt

# 4. Setup .env from example if not exists
echo "[4/6] Checking .env..."
if [ ! -f .env ]; then
    cp .env.aws.example .env
    echo ""
    echo "  .env created from template. Edit it now:"
    echo "  nano /home/ec2-user/clerk/backend/.env"
    echo ""
    read -p "  Press Enter after editing .env to continue..."
fi

# 5. Import local data into DynamoDB (optional)
read -p "[5/6] Import db.json data to DynamoDB? (y/n): " IMPORT
if [ "$IMPORT" = "y" ]; then
    python3.11 scripts/import_to_dynamo.py
fi

# 6. Start the app with systemd (runs on boot automatically)
echo "[6/6] Setting up systemd service..."

sudo bash -c 'cat > /etc/systemd/system/edunova.service << EOF
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
EOF'

sudo systemctl daemon-reload
sudo systemctl enable edunova
sudo systemctl start edunova

echo ""
echo "=============================="
echo " Setup Complete!"
echo "=============================="
echo ""
echo "  App status: sudo systemctl status edunova"
echo "  View logs:  sudo journalctl -u edunova -f"
echo "  Restart:    sudo systemctl restart edunova"
echo ""

# Show public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "unknown")
echo "  App URL:    http://$PUBLIC_IP:8000"
echo "  API Docs:   http://$PUBLIC_IP:8000/docs"
echo ""
