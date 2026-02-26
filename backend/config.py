"""
Configuration settings and constants for ShowMeLive
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Database
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "showmelive")

# CORS
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

# Admin credentials
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@showmelive.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

# Stripe
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")

# LiveKit
LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET", "")

# Platform settings
PLATFORM_FEE_PERCENTAGE = 20.0  # 20% platform fee
STREAMING_PACKAGES = {"free": 0.0, "premium": 1000.0}

# Security settings
VIOLATION_THRESHOLDS = {
    "warn": 1,           # First violation: warn
    "end_session": 3,    # 3+ violations: end session
    "suspend_30d": 5,    # 5+ violations: 30-day suspension
    "permanent_ban": 1   # 1 violation after 30-day suspension: permanent ban
}

# Upload settings
UPLOAD_DIR = "/tmp/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
