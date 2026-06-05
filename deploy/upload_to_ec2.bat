@echo off
REM ─────────────────────────────────────────────────────────────
REM  Upload EduNova project to EC2 (Windows)
REM  Run this from the project root folder (where index.html is)
REM ─────────────────────────────────────────────────────────────

set /p EC2_IP="Enter EC2 Public IP: "
set KEY_FILE=clerk-keypair.pem

echo.
echo Uploading project to ec2-user@%EC2_IP%...
echo.

REM Upload everything except legacy, cache and .env
scp -i %KEY_FILE% -r ^
    assets ^
    backend ^
    index.html ^
    ec2-user@%EC2_IP%:/home/ec2-user/clerk/

echo.
echo Upload complete!
echo.
echo Next steps:
echo   1. SSH in:   ssh -i %KEY_FILE% ec2-user@%EC2_IP%
echo   2. Then run: cd /home/ec2-user/clerk/backend
echo                pip3 install -r requirements.txt
echo                cp .env.aws.example .env
echo                nano .env   (fill in your values)
echo                uvicorn main:app --host 0.0.0.0 --port 8000 --reload
echo.
pause
