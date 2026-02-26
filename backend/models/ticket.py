"""Ticket models for ShowMeLive"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class Ticket(BaseModel):
    """Ticket model for event access"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    user_id: str
    quantity: int = 1
    amount_paid: float
    status: str = "active"  # "active", "used", "refunded"
    refund_reason: Optional[str] = None
    purchase_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TicketCreate(BaseModel):
    """Request model for purchasing a ticket"""
    event_id: str
    quantity: int = 1
