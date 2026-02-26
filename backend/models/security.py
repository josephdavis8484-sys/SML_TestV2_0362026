"""Security models for ShowMeLive"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class SecurityEvent(BaseModel):
    """Log entry for security violations (screenshot/recording attempts)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    event_id: str
    device_id: Optional[str] = None
    session_id: Optional[str] = None
    capture_type: str  # "screenshot", "recording", "screen_share", "visibility_hidden"
    os: str  # "windows", "macos", "ios", "android", "linux", "unknown"
    browser: Optional[str] = None
    app_version: str = "1.0.0"
    action_taken: str  # "warn", "end_session", "suspend_30d", "permanent_ban"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    details: Optional[str] = None


class SecurityViolation(BaseModel):
    """Aggregated violation record for a user"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    total_violations: int = 0
    screenshot_count: int = 0
    recording_count: int = 0
    screen_share_count: int = 0
    last_violation_at: Optional[datetime] = None
    suspension_status: str = "none"  # "none", "warned", "suspended_30d", "permanent_ban"
    suspension_start: Optional[datetime] = None
    suspension_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReportCaptureRequest(BaseModel):
    """Request to report a capture attempt"""
    event_id: str
    capture_type: str  # "screenshot", "recording", "screen_share", "visibility_hidden"
    device_id: Optional[str] = None
    session_id: Optional[str] = None
    os: str = "unknown"
    browser: Optional[str] = None
    app_version: str = "1.0.0"
    details: Optional[str] = None
