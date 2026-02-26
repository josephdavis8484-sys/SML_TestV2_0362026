"""User models for ShowMeLive"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict
from pydantic import BaseModel, Field, ConfigDict


class User(BaseModel):
    """User model for authentication and profile"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "viewer"  # "viewer", "creator", "admin"
    google_id: Optional[str] = None
    is_blocked: bool = False
    block_reason: Optional[str] = None
    blocked_at: Optional[str] = None
    bank_linked: bool = False
    bank_info: Optional[Dict] = None
    stripe_account_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserSession(BaseModel):
    """User session for authentication"""
    model_config = ConfigDict(extra="ignore")
    
    session_token: str
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime


class RoleSelection(BaseModel):
    """Request model for role selection"""
    role: str  # "viewer" or "creator"
