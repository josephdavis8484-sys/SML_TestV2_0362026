"""Event models for ShowMeLive"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class Event(BaseModel):
    """Event model for live streaming events"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    creator_id: str
    title: str
    description: str
    category: str
    date: str  # ISO format date string
    start_time: str  # HH:MM format
    end_time: str
    price: float
    poster_url: Optional[str] = None
    venue: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geo_restricted: bool = False
    allowed_radius_km: float = 0  # 0 means no restriction
    streaming_package: str = "free"  # "free" or "premium"
    status: str = "upcoming"  # "upcoming", "live", "completed", "cancelled"
    total_revenue: float = 0.0
    viewer_count: int = 0
    chat_enabled: bool = True  # Default to True for better UX
    reactions_enabled: bool = True  # Default to True for better UX
    share_link: Optional[str] = None
    cancellation_reason: Optional[str] = None
    is_blocked: bool = False
    block_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EventCreate(BaseModel):
    """Request model for creating an event"""
    title: str
    description: str
    category: str
    date: str
    start_time: str
    end_time: str
    price: float
    poster_url: Optional[str] = None
    venue: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geo_restricted: bool = False
    allowed_radius_km: float = 0
    streaming_package: str = "free"
    chat_enabled: bool = True
    reactions_enabled: bool = True


class StreamingDevice(BaseModel):
    """Streaming device for multi-camera support"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    device_token: str
    device_name: str
    is_control_panel: bool = False
    is_active: bool = False
    is_connected: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
