# 🎓 Clerk Management System

![Python](https://img.shields.io/badge/Python-FastAPI-blue?logo=python)
![PHP](https://img.shields.io/badge/PHP-8%2B-purple?logo=php)
![AWS](https://img.shields.io/badge/AWS-DynamoDB%20%7C%20EC2-orange?logo=amazonaws)
![MySQL](https://img.shields.io/badge/Database-MySQL-blue?logo=mysql)
![License](https://img.shields.io/badge/License-MIT-green)
![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red)

> A complete coaching institute management system — handle student fees, dues, clearance certificates, WhatsApp payment reminders, and reports. Two backends: PHP+MySQL for local XAMPP or Python FastAPI+AWS DynamoDB for cloud.

---

## ✨ Features

| Module | Description |
|--------|-------------|
| 👨‍🎓 Students | Enroll, search, profiles, course assignment |
| 💰 Fees & Dues | Fee collection, due tracking, partial payments |
| ✅ Clearance | Issue clearance certificates, track status |
| 📱 Reminders | WhatsApp fee reminders via Twilio |
| 📊 Reports | Defaulters list, collection reports, analytics |
| 👥 Users | Admin / Teacher / Staff roles |
| 🔐 Auth | JWT-based authentication |

---

## 🏗️ Two Ways to Run

```
Option A — Local (XAMPP)         Option B — Cloud (AWS)
─────────────────────            ──────────────────────
PHP 8+ + MySQL                   Python FastAPI
XAMPP (Windows)                  AWS DynamoDB
No internet needed               Scales automatically
```

---

## 🚀 Quick Start

### Option A — Local XAMPP (5 minutes)
```
1. Install XAMPP → start Apache + MySQL
2. Copy project to: C:\xampp\htdocs\clerk-management-system\
3. Open browser → http://localhost/clerk-management-system/install.php
4. Done! Login: admin / admin123
```

### Option B — AWS Cloud
```bash
# 1. Copy and fill in your credentials
cp backend/.env.example backend/.env

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Set up AWS DynamoDB tables
python backend/scripts/setup_aws.py

# 4. Run the server
python backend/main.py
# Visit http://localhost:8000/docs for API docs
```

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for full configuration details.

---

## 📁 Project Structure

```
Clerk-Management-System/
├── index.html              # Frontend (single file)
├── assets/js/              # Frontend modules
│   ├── students.js         # Student management
│   ├── dues.js             # Fee tracking
│   ├── clearance.js        # Clearance certificates
│   └── ...
├── backend/                # Python FastAPI (cloud)
│   ├── main.py
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   └── scripts/            # Setup & seed scripts
└── _legacy/                # PHP+MySQL version
    ├── api/                # PHP REST API
    └── setup/              # SQL migrations
```

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS
- **Backend (local):** PHP 8 + MySQL
- **Backend (cloud):** Python FastAPI + AWS DynamoDB
- **Auth:** JWT tokens
- **WhatsApp:** Twilio

---

## 🎓 Use Cases

- ✅ Final year MCA / BCA project
- ✅ Real coaching institute deployment
- ✅ Learning FastAPI + DynamoDB
- ✅ Learning PHP REST APIs

---

## 🤝 Contributing

Pull requests welcome. Open an issue first for major changes.

## 📄 License

[MIT](LICENSE) — free for personal, academic and commercial use.
