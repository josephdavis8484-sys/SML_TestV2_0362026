"""Notification models for ShowMeLive"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict
from pydantic import BaseModel, Field, ConfigDict


class Notification(BaseModel):
    """Notification model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # "event_live", "event_reminder", "ticket_purchased", "payout_completed"
    title: str
    message: str
    event_id: Optional[str] = None
    data: Dict = {}
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotificationCreate(BaseModel):
    """Request model for creating a notification"""
    user_id: str
    type: str
    title: str
    message: str
    event_id: Optional[str] = None
    data: Dict = {}
