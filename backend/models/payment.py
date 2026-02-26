"""Payment models for ShowMeLive"""
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict
from pydantic import BaseModel, Field, ConfigDict


class PaymentTransaction(BaseModel):
    """Payment transaction record"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: str
    event_id: Optional[str] = None
    amount: float
    currency: str = "usd"
    payment_type: str  # "ticket", "streaming_package", "pro_mode_unlock"
    payment_status: str = "pending"  # "pending", "completed", "failed", "refunded"
    metadata: Dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PromoCode(BaseModel):
    """Promo code for discounts"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    description: str = ""
    discount_type: str = "percentage"  # "percentage" or "fixed"
    discount_value: float
    applies_to: str = "pro_mode"  # "pro_mode", "ticket", "all"
    max_uses: Optional[int] = None
    current_uses: int = 0
    min_purchase: float = 0.0
    start_date: Optional[str] = None
    expiration_date: Optional[str] = None
    is_active: bool = True
    created_by: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PromoCodeCreate(BaseModel):
    """Request model for creating a promo code"""
    code: str
    description: str = ""
    discount_type: str = "percentage"
    discount_value: float
    applies_to: str = "pro_mode"
    max_uses: Optional[int] = None
    min_purchase: float = 0.0
    start_date: Optional[str] = None
    expiration_date: Optional[str] = None


class PromoCodeUpdate(BaseModel):
    """Request model for updating a promo code"""
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    max_uses: Optional[int] = None
    min_purchase: Optional[float] = None
    start_date: Optional[str] = None
    expiration_date: Optional[str] = None
    is_active: Optional[bool] = None


class PromoCodeValidate(BaseModel):
    """Request model for validating a promo code"""
    code: str
    purchase_type: str = "pro_mode"
    purchase_amount: float = 1000.0
