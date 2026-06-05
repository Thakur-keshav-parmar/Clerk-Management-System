from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from config.settings import ALLOWED_ORIGIN
from routes import auth, courses, students, payments, dues, clearance, dashboard, admin, users, reports, defaulters, reminders

app = FastAPI(
    title="EduNova API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS — set ALLOWED_ORIGIN=https://yourdomain.com in .env on EC2
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(students.router)
app.include_router(payments.router)
app.include_router(dues.router)
app.include_router(clearance.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(reports.router)
app.include_router(defaulters.router)
app.include_router(reminders.router)

# Serve frontend (index.html + assets) from the parent clerk/ folder
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR   = os.path.join(FRONTEND_DIR, "assets")

if os.path.exists(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

@app.get("/", include_in_schema=False)
def root():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "College Clerk System API — see /docs"}

@app.get("/health")
def health():
    return {"status": "ok", "storage": "local"}
