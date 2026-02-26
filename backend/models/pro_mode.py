"""Pro Mode models for ShowMeLive"""
import uuid
import secrets
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class ProModeDevice(BaseModel):
    """Camera device for Pro Mode multi-camera streaming"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    device_number: int  # 1-5
    device_name: str = "Camera"
    is_active: bool = False  # Currently selected for broadcast
    is_connected: bool = False
    audio_enabled: bool = True
    video_enabled: bool = True
    connected_at: Optional[datetime] = None
    last_heartbeat: Optional[datetime] = None


class ProModeSession(BaseModel):
    """Manages a Pro Mode streaming session for an event"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    creator_id: str
    room_name: str
    connection_token: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    active_device_id: Optional[str] = None
    transition_type: str = "cut"  # cut, fade, dissolve, blend
    devices: List[ProModeDevice] = []
    max_devices: int = 5
    is_live: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProModeDeviceRegister(BaseModel):
    """Request to register a device for Pro Mode"""
    event_id: str
    device_number: int
    device_name: Optional[str] = None


class ProModeSwitchDevice(BaseModel):
    """Request to switch active device"""
    event_id: str
    device_id: str
    transition_type: Optional[str] = None


class ProModeAudioSettings(BaseModel):
    """Audio settings for a device"""
    mic_enabled: Optional[bool] = None
    balance: Optional[int] = None
    treble: Optional[int] = None
    bass: Optional[int] = None
