from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import qrcode
from io import BytesIO
import base64
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
from icalendar import Calendar, Event as ICalEvent, Alarm
from datetime import timedelta as td
from dateutil import parser
import jwt
from livekit import api as livekit_api
import stripe
import asyncio
import json
import math
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize Stripe
stripe.api_key = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Constants
SESSION_DURATION_DAYS = 7
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
STREAMING_PACKAGES = {"free": 0.0, "premium": 1000.0}
PLATFORM_FEE_PERCENTAGE = 20
PAYOUT_DELAY_HOURS = 24
GEO_FENCE_RADIUS_METERS = 1000  # Default geo-fence radius

# LiveKit Configuration (for when keys are provided)
LIVEKIT_URL = os.environ.get('LIVEKIT_URL', 'http://localhost:7880')
LIVEKIT_API_KEY = os.environ.get('LIVEKIT_API_KEY', '')
LIVEKIT_API_SECRET = os.environ.get('LIVEKIT_API_SECRET', '')

# Helper function to calculate distance between two coordinates (Haversine formula)
def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the distance between two points on Earth in meters using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

# Plaid Configuration (for when keys are provided)
PLAID_CLIENT_ID = os.environ.get('PLAID_CLIENT_ID', '')
PLAID_SECRET = os.environ.get('PLAID_SECRET', '')
PLAID_ENV = os.environ.get('PLAID_ENV', 'sandbox')  # sandbox, development, production

# Upload directory
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# WebSocket Connection Manager for Live Chat
class ChatConnectionManager:
    def __init__(self):
        # Dictionary mapping event_id -> list of connected WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, event_id: str):
        await websocket.accept()
        if event_id not in self.active_connections:
            self.active_connections[event_id] = []
        self.active_connections[event_id].append(websocket)
        logging.info(f"WebSocket connected to event {event_id}. Total connections: {len(self.active_connections[event_id])}")
    
    def disconnect(self, websocket: WebSocket, event_id: str):
        if event_id in self.active_connections:
            if websocket in self.active_connections[event_id]:
                self.active_connections[event_id].remove(websocket)
            if not self.active_connections[event_id]:
                del self.active_connections[event_id]
        logging.info(f"WebSocket disconnected from event {event_id}")
    
    async def broadcast_to_event(self, event_id: str, message: dict):
        """Broadcast a message to all connections for an event"""
        if event_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[event_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logging.error(f"Error sending to WebSocket: {e}")
                    disconnected.append(connection)
            # Clean up disconnected sockets
            for conn in disconnected:
                self.disconnect(conn, event_id)
    
    def get_connection_count(self, event_id: str) -> int:
        return len(self.active_connections.get(event_id, []))

# Initialize the chat manager
chat_manager = ChatConnectionManager()

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    role: Optional[str] = None  # "viewer", "creator", or "admin"
    stripe_account_id: Optional[str] = None
    bank_linked: bool = False
    bank_account_mask: Optional[str] = None  # Last 4 digits
    bank_account_name: Optional[str] = None
    bank_institution: Optional[str] = None
    onboarding_completed: bool = False
    is_blocked: bool = False
    block_reason: Optional[str] = None
    blocked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    creator_id: Optional[str] = None
    title: str
    category: str
    image_url: str = "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=600&fit=crop"
    date: str
    start_time: str = ""  # Event start time (e.g., "19:00" or "7:00 PM")
    end_time: str = ""    # Event end time (e.g., "21:00" or "9:00 PM")
    time: str = "7:00 PM"  # Legacy field - kept for backwards compatibility
    description: str
    venue: str
    # Location fields
    city: str = ""
    state: str = ""
    country: str = "US"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    price: float
    streaming_package: str = "free"  # "free" or "premium"
    stream_url: Optional[str] = None
    qr_code: Optional[str] = None
    share_link: Optional[str] = None
    status: str = "upcoming"  # "upcoming", "live", "completed", "cancelled"
    # Chat & Interaction settings
    chat_enabled: bool = False
    reactions_enabled: bool = False
    chat_mode: str = "open"  # "open", "moderated", "questions_only"
    # Geo-fencing settings (radius-based from city location)
    geo_restricted: bool = False
    geo_radius_meters: int = 1000  # Default 1000 meters radius
    allowed_countries: List[str] = []  # Legacy - kept for backwards compatibility
    blocked_countries: List[str] = []  # Legacy - kept for backwards compatibility
    is_blocked: bool = False
    block_reason: Optional[str] = None
    total_revenue: float = 0.0
    payout_processed: bool = False
    payout_date: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    title: str
    category: str
    date: str
    start_time: str = ""
    end_time: str = ""
    description: str
    venue: str
    city: str = ""
    state: str = ""
    country: str = "US"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    price: float
    image_url: str = "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=600&fit=crop"
    streaming_package: str = "free"
    chat_enabled: bool = False
    reactions_enabled: bool = False
    chat_mode: str = "open"
    # Geo-fencing
    geo_restricted: bool = False
    geo_radius_meters: int = 1000

class StreamingDevice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    device_token: str
    device_name: str
    is_active: bool = False
    is_control_panel: bool = False
    last_active: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    user_id: str
    quantity: int
    amount_paid: float = 0.0
    refunded: bool = False
    refund_reason: Optional[str] = None
    refund_date: Optional[datetime] = None
    purchase_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketCreate(BaseModel):
    event_id: str
    quantity: int

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: Optional[str] = None
    event_id: Optional[str] = None
    amount: float
    currency: str
    payment_type: str  # "ticket" or "streaming_package"
    payment_status: str  # "pending", "completed", "failed"
    metadata: Dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PromoCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # The actual promo code string (e.g., "LAUNCH50")
    description: str = ""
    discount_type: str = "percentage"  # "percentage" or "fixed"
    discount_value: float  # e.g., 50 for 50% off or 500 for $500 off
    applies_to: str = "pro_mode"  # "pro_mode", "ticket", "all"
    max_uses: Optional[int] = None  # None means unlimited
    current_uses: int = 0
    min_purchase: float = 0.0  # Minimum purchase amount to apply
    start_date: Optional[str] = None  # ISO format date string
    expiration_date: Optional[str] = None  # ISO format date string
    is_active: bool = True
    created_by: str  # Admin user ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PromoCodeCreate(BaseModel):
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
    description: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    max_uses: Optional[int] = None
    min_purchase: Optional[float] = None
    start_date: Optional[str] = None
    expiration_date: Optional[str] = None
    is_active: Optional[bool] = None

class PromoCodeValidate(BaseModel):
    code: str
    purchase_type: str = "pro_mode"  # "pro_mode" or "ticket"
    purchase_amount: float = 1000.0

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # "event_live", "event_reminder", "ticket_purchased", "payout_completed"
    title: str
    message: str
    event_id: Optional[str] = None
    read: bool = False
    data: Dict = {}  # Additional data like event details
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationCreate(BaseModel):
    type: str
    title: str
    message: str
    event_id: Optional[str] = None
    data: Dict = {}

# WebSocket Connection Manager for User Notifications
class NotificationConnectionManager:
    def __init__(self):
        # Dictionary mapping user_id -> list of connected WebSockets
        self.user_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)
        logging.info(f"Notification WebSocket connected for user {user_id}")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        logging.info(f"Notification WebSocket disconnected for user {user_id}")
    
    async def send_to_user(self, user_id: str, notification: dict):
        """Send a notification to a specific user"""
        if user_id in self.user_connections:
            disconnected = []
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_json(notification)
                except Exception as e:
                    logging.error(f"Error sending notification: {e}")
                    disconnected.append(connection)
            for conn in disconnected:
                self.disconnect(conn, user_id)
    
    async def send_to_multiple_users(self, user_ids: List[str], notification: dict):
        """Send a notification to multiple users"""
        for user_id in user_ids:
            await self.send_to_user(user_id, notification)

# Initialize the notification manager
notification_manager = NotificationConnectionManager()

class SessionRequest(BaseModel):
    session_id: str

class RoleSelection(BaseModel):
    role: str

# Auth Helper Functions
async def get_session_token(request: Request) -> Optional[str]:
    session_token = request.cookies.get("session_token")
    if session_token:
        return session_token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "")
    return None

async def get_current_user(request: Request) -> User:
    session_token = await get_session_token(request)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({
        "session_token": session_token,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    user_doc = await db.users.find_one({"id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# Auth Routes
@api_router.post("/auth/session")
async def create_session(session_req: SessionRequest, response: Response):
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                EMERGENT_AUTH_URL,
                headers={"X-Session-ID": session_req.session_id},
                timeout=10.0
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session ID")
            
            auth_data = resp.json()
        
        existing_user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["id"]
            user = User(**existing_user)
        else:
            user = User(
                id=auth_data.get("id", str(uuid.uuid4())),
                email=auth_data["email"],
                name=auth_data["name"],
                picture=auth_data.get("picture")
            )
            
            user_doc = user.model_dump()
            user_doc['created_at'] = user_doc['created_at'].isoformat()
            await db.users.insert_one(user_doc)
            user_id = user.id
        
        session_token = auth_data["session_token"]
        expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DURATION_DAYS)
        
        session = UserSession(
            user_id=user_id,
            session_token=session_token,
            expires_at=expires_at
        )
        
        session_doc = session.model_dump()
        session_doc['expires_at'] = session_doc['expires_at'].isoformat()
        session_doc['created_at'] = session_doc['created_at'].isoformat()
        
        await db.user_sessions.insert_one(session_doc)
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=SESSION_DURATION_DAYS * 24 * 60 * 60,
            path="/"
        )
        
        return {"user": user.model_dump(), "session_token": session_token}
    
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Auth service error: {str(e)}")

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/role")
async def set_role(role_selection: RoleSelection, current_user: User = Depends(get_current_user)):
    if role_selection.role not in ["viewer", "creator"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"role": role_selection.role}}
    )
    
    current_user.role = role_selection.role
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = await get_session_token(request)
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# Event Routes
@api_router.get("/events", response_model=List[Event])
async def get_events():
    """Get all upcoming events that haven't expired (based on date)"""
    # Get current date for filtering
    today = datetime.now(timezone.utc).date()
    
    # Find events that are upcoming/live and not cancelled/blocked
    events = await db.events.find({
        "status": {"$in": ["upcoming", "live"]},
        "is_blocked": {"$ne": True}
    }, {"_id": 0}).to_list(1000)
    
    # Filter out expired events (date has passed)
    valid_events = []
    for event in events:
        if isinstance(event.get('created_at'), str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
        
        # Parse event date
        event_date_str = event.get('date', '')
        event_date = None
        for fmt in ['%Y-%m-%d', '%B %d, %Y', '%b %d, %Y', '%m/%d/%Y']:
            try:
                event_date = datetime.strptime(event_date_str, fmt).date()
                break
            except ValueError:
                continue
        
        # If we couldn't parse the date, include the event (benefit of doubt)
        if event_date is None:
            valid_events.append(event)
            continue
        
        # Include events from today or future (show all day events even after they end)
        if event_date >= today:
            valid_events.append(event)
        # Else: event_date < today, skip it (expired)
    
    return valid_events

# Search events by city/state - MUST be before /events/{event_id}
@api_router.get("/events/search/location")
async def search_events_by_location(
    city: Optional[str] = None,
    state: Optional[str] = None,
    country: str = "US"
):
    """Search events by city and/or state (excludes expired events)"""
    query = {"status": {"$nin": ["cancelled"]}, "is_blocked": {"$ne": True}}
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if state:
        query["state"] = {"$regex": state, "$options": "i"}
    if country:
        query["country"] = country.upper()
    
    events = await db.events.find(query, {"_id": 0}).to_list(100)
    
    # Filter out expired events
    today = datetime.now(timezone.utc).date()
    valid_events = []
    for event in events:
        event_date_str = event.get('date', '')
        try:
            event_date = None
            for fmt in ['%Y-%m-%d', '%B %d, %Y', '%b %d, %Y', '%m/%d/%Y']:
                try:
                    event_date = datetime.strptime(event_date_str, fmt).date()
                    break
                except ValueError:
                    continue
            
            if event_date is None or event_date >= today:
                valid_events.append(event)
        except Exception:
            valid_events.append(event)
    
    return {
        "events": valid_events,
        "count": len(valid_events),
        "filters": {
            "city": city,
            "state": state,
            "country": country
        }
    }

# Get unique cities and states for filtering - MUST be before /events/{event_id}
@api_router.get("/events/locations")
async def get_event_locations():
    """Get list of unique cities and states that have events"""
    pipeline = [
        {"$match": {"status": {"$nin": ["cancelled"]}, "is_blocked": {"$ne": True}}},
        {"$group": {
            "_id": {"city": {"$ifNull": ["$city", ""]}, "state": {"$ifNull": ["$state", ""]}},
            "count": {"$sum": 1}
        }},
        {"$match": {"_id.city": {"$ne": ""}}},
        {"$sort": {"count": -1}}
    ]
    
    locations = await db.events.aggregate(pipeline).to_list(100)
    
    # Format response
    cities = []
    states = set()
    
    for loc in locations:
        city_val = loc.get("_id", {}).get("city", "")
        state_val = loc.get("_id", {}).get("state", "")
        if city_val:
            cities.append({
                "city": city_val,
                "state": state_val,
                "event_count": loc.get("count", 0)
            })
        if state_val:
            states.add(state_val)
    
    return {
        "cities": cities,
        "states": list(states)
    }

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if isinstance(event.get('created_at'), str):
        event['created_at'] = datetime.fromisoformat(event['created_at'])
    return Event(**event)

@api_router.post("/events/upload-image")
async def upload_event_image(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can upload images")
    
    file_extension = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / file_name
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return {"image_url": f"/api/uploads/{file_name}"}

@api_router.get("/uploads/{file_name}")
async def get_uploaded_file(file_name: str):
    file_path = UPLOAD_DIR / file_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    with open(file_path, "rb") as f:
        return StreamingResponse(BytesIO(f.read()), media_type="image/jpeg")

@api_router.post("/events", response_model=Event)
async def create_event(event_input: EventCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can create events")
    
    event_id = str(uuid.uuid4())
    share_link = f"{os.environ.get('FRONTEND_URL', 'https://livestream-hub-78.preview.emergentagent.com')}/event/{event_id}"
    
    event = Event(
        id=event_id,
        creator_id=current_user.id,
        **event_input.model_dump(),
        share_link=share_link
    )
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(share_link)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="blue", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    event.qr_code = f"data:image/png;base64,{qr_base64}"
    
    event_doc = event.model_dump()
    event_doc['created_at'] = event_doc['created_at'].isoformat()
    
    await db.events.insert_one(event_doc)
    
    return event

@api_router.get("/events/creator/my-events", response_model=List[Event])
async def get_my_events(current_user: User = Depends(get_current_user)):
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can view their events")
    
    events = await db.events.find({"creator_id": current_user.id}, {"_id": 0}).to_list(1000)
    for event in events:
        if isinstance(event.get('created_at'), str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
    return events

# Streaming Device Routes
@api_router.post("/streaming/generate-device-token")
async def generate_device_token(event_id: str, device_name: str, is_control_panel: bool, current_user: User = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id, "creator_id": current_user.id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    device_token = str(uuid.uuid4())
    device = StreamingDevice(
        event_id=event_id,
        device_token=device_token,
        device_name=device_name,
        is_control_panel=is_control_panel
    )
    
    device_doc = device.model_dump()
    device_doc['created_at'] = device_doc['created_at'].isoformat()
    await db.streaming_devices.insert_one(device_doc)
    
    # Generate QR code for device pairing
    device_url = f"{os.environ.get('FRONTEND_URL', 'https://livestream-hub-78.preview.emergentagent.com')}/stream/{device_token}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(device_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="blue", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "device_id": device.id,
        "device_token": device_token,
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "device_url": device_url
    }

@api_router.get("/streaming/devices/{event_id}")
async def get_event_devices(event_id: str, current_user: User = Depends(get_current_user)):
    devices = await db.streaming_devices.find({"event_id": event_id}, {"_id": 0}).to_list(100)
    return devices

@api_router.post("/streaming/activate-device")
async def activate_device(device_token: str):
    device = await db.streaming_devices.find_one({"device_token": device_token})
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    await db.streaming_devices.update_one(
        {"device_token": device_token},
        {"$set": {"is_active": True, "last_active": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Device activated", "device_id": device["id"]}

# Ticket Routes
@api_router.get("/tickets", response_model=List[Ticket])
async def get_my_tickets(current_user: User = Depends(get_current_user)):
    tickets = await db.tickets.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    for ticket in tickets:
        if isinstance(ticket.get('purchase_date'), str):
            ticket['purchase_date'] = datetime.fromisoformat(ticket['purchase_date'])
    return tickets

@api_router.post("/tickets", response_model=Ticket)
async def purchase_ticket(ticket_input: TicketCreate, current_user: User = Depends(get_current_user)):
    """Purchase ticket (authenticated)"""
    # Verify event exists
    event = await db.events.find_one({"id": ticket_input.event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Calculate total amount
    amount_paid = float(event["price"]) * ticket_input.quantity
    
    ticket = Ticket(
        event_id=ticket_input.event_id,
        user_id=current_user.id,
        quantity=ticket_input.quantity,
        amount_paid=amount_paid
    )
    
    ticket_doc = ticket.model_dump()
    ticket_doc['purchase_date'] = ticket_doc['purchase_date'].isoformat()
    
    await db.tickets.insert_one(ticket_doc)
    
    return ticket

@api_router.get("/tickets/{ticket_id}/calendar")
async def download_calendar(ticket_id: str, current_user: User = Depends(get_current_user)):
    """Generate ICS calendar file for a ticket"""
    # Get ticket
    ticket = await db.tickets.find_one({"id": ticket_id, "user_id": current_user.id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Get event details
    event = await db.events.find_one({"id": ticket["event_id"]}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Create calendar
    cal = Calendar()
    cal.add('prodid', '-//ShowMeLive//Event Ticket//EN')
    cal.add('version', '2.0')
    cal.add('calscale', 'GREGORIAN')
    cal.add('method', 'PUBLISH')
    cal.add('x-wr-calname', 'ShowMeLive Events')
    cal.add('x-wr-timezone', 'America/New_York')
    
    # Create event
    ical_event = ICalEvent()
    ical_event.add('uid', f"showmelive-{event['id']}@showmelive.online")
    ical_event.add('summary', event['title'])
    ical_event.add('description', f"{event['description']}\n\nTicket Quantity: {ticket['quantity']}\n\nEvent URL: {event.get('share_link', '')}" )
    ical_event.add('location', event['venue'])
    
    # Parse date and time
    try:
        # Combine date and time
        date_str = event['date']
        time_str = event['time']
        
        # Try to parse the date
        event_datetime = parser.parse(f"{date_str} {time_str}")
        
        # Set start time
        ical_event.add('dtstart', event_datetime)
        # Set end time (2 hours after start)
        ical_event.add('dtend', event_datetime + td(hours=2))
    except Exception:
        # Fallback if parsing fails
        ical_event.add('dtstart', datetime.now(timezone.utc))
        ical_event.add('dtend', datetime.now(timezone.utc) + td(hours=2))
    
    ical_event.add('dtstamp', datetime.now(timezone.utc))
    ical_event.add('status', 'CONFIRMED')
    ical_event.add('category', event['category'])
    ical_event.add('url', event.get('share_link', ''))
    
    # Add reminder 1 day before
    alarm = Alarm()
    alarm.add('action', 'DISPLAY')
    alarm.add('description', f"Reminder: {event['title']} tomorrow!")
    alarm.add('trigger', td(days=-1))
    ical_event.add_component(alarm)
    
    cal.add_component(ical_event)
    
    # Generate ICS file
    ics_content = cal.to_ical()
    
    # Return as downloadable file
    return StreamingResponse(
        BytesIO(ics_content),
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename={event['title'].replace(' ', '_')}.ics"
        }
    )

# Payment Routes
@api_router.post("/payments/checkout/session")
async def create_checkout_session(request: Request, current_user: User = Depends(get_current_user)):
    body = await request.json()
    payment_type = body.get("payment_type")
    origin_url = body.get("origin_url")
    
    if not origin_url:
        raise HTTPException(status_code=400, detail="origin_url is required")
    
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = origin_url
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Determine amount based on payment type
    if payment_type == "streaming_package":
        package = body.get("package", "free")
        if package not in STREAMING_PACKAGES:
            raise HTTPException(status_code=400, detail="Invalid package")
        amount = STREAMING_PACKAGES[package]
    elif payment_type == "ticket":
        event_id = body.get("event_id")
        quantity = body.get("quantity", 1)
        
        event = await db.events.find_one({"id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        amount = float(event["price"]) * quantity
    else:
        raise HTTPException(status_code=400, detail="Invalid payment_type")
    
    success_url = f"{origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/payment-cancel"
    
    metadata = {
        "user_id": current_user.id,
        "payment_type": payment_type,
    }
    
    if payment_type == "ticket":
        metadata["event_id"] = event_id
        metadata["quantity"] = str(quantity)
    elif payment_type == "streaming_package":
        metadata["package"] = package
        metadata["event_id"] = body.get("event_id", "")
    
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = PaymentTransaction(
        session_id=session.session_id,
        user_id=current_user.id,
        event_id=metadata.get("event_id"),
        amount=amount,
        currency="usd",
        payment_type=payment_type,
        payment_status="pending",
        metadata=metadata
    )
    
    trans_doc = transaction.model_dump()
    trans_doc['created_at'] = trans_doc['created_at'].isoformat()
    await db.payment_transactions.insert_one(trans_doc)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, current_user: User = Depends(get_current_user)):
    api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if transaction and transaction["payment_status"] != "completed":
        if status.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "completed"}}
            )
            
            # Process based on payment type
            if transaction["payment_type"] == "ticket":
                event_id = transaction["metadata"]["event_id"]
                quantity = int(transaction["metadata"]["quantity"])
                
                ticket = Ticket(
                    event_id=event_id,
                    user_id=current_user.id,
                    quantity=quantity,
                    amount_paid=transaction["amount"]
                )
                
                ticket_doc = ticket.model_dump()
                ticket_doc['purchase_date'] = ticket_doc['purchase_date'].isoformat()
                await db.tickets.insert_one(ticket_doc)
                
                # Update event revenue
                await db.events.update_one(
                    {"id": event_id},
                    {"$inc": {"total_revenue": transaction["amount"]}}
                )
            
            elif transaction["payment_type"] == "streaming_package":
                event_id = transaction["metadata"].get("event_id")
                package = transaction["metadata"]["package"]
                
                if event_id:
                    await db.events.update_one(
                        {"id": event_id},
                        {"$set": {"streaming_package": package}}
                    )
    
    return status

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    await stripe_checkout.handle_webhook(body, signature)
    return {"status": "received"}

# Creator Earnings
@api_router.get("/creator/earnings")
async def get_creator_earnings(current_user: User = Depends(get_current_user)):
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can view earnings")
    
    events = await db.events.find({"creator_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    total_revenue = sum(e.get("total_revenue", 0.0) for e in events)
    platform_fee = total_revenue * (PLATFORM_FEE_PERCENTAGE / 100)
    creator_earnings = total_revenue - platform_fee
    
    pending_payout = sum(
        e.get("total_revenue", 0.0) * (1 - PLATFORM_FEE_PERCENTAGE / 100)
        for e in events 
        if not e.get("payout_processed", False)
    )
    
    return {
        "total_revenue": total_revenue,
        "platform_fee": platform_fee,
        "creator_earnings": creator_earnings,
        "pending_payout": pending_payout,
        "events": events
    }

# Admin Helper
async def get_admin_user(request: Request) -> User:
    user = await get_current_user(request)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# Admin Routes
@api_router.post("/admin/login")
async def admin_login(email: str, password: str):
    """Admin login with email/password"""
    # Hardcoded admin credentials (should be in env variables in production)
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@showmelive.com")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    if email != ADMIN_EMAIL or password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if admin user exists
    admin_user = await db.users.find_one({"email": ADMIN_EMAIL}, {"_id": 0})
    
    if not admin_user:
        # Create admin user
        admin = User(
            id="admin-" + str(uuid.uuid4()),
            email=ADMIN_EMAIL,
            name="Admin",
            role="admin"
        )
        admin_doc = admin.model_dump()
        admin_doc['created_at'] = admin_doc['created_at'].isoformat()
        await db.users.insert_one(admin_doc)
        admin_user = admin_doc
    
    # Create session token
    session_token = "admin_" + str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = UserSession(
        user_id=admin_user["id"],
        session_token=session_token,
        expires_at=expires_at
    )
    
    session_doc = session.model_dump()
    session_doc['expires_at'] = session_doc['expires_at'].isoformat()
    session_doc['created_at'] = session_doc['created_at'].isoformat()
    
    await db.user_sessions.insert_one(session_doc)
    
    return {"session_token": session_token, "user": admin_user}

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(current_user: User = Depends(get_admin_user)):
    """Get admin dashboard statistics"""
    # Count statistics
    total_users = await db.users.count_documents({})
    total_creators = await db.users.count_documents({"role": "creator"})
    total_viewers = await db.users.count_documents({"role": "viewer"})
    blocked_users = await db.users.count_documents({"is_blocked": True})
    
    total_events = await db.events.count_documents({})
    live_events = await db.events.count_documents({"status": "live"})
    blocked_events = await db.events.count_documents({"is_blocked": True})
    
    total_tickets = await db.tickets.count_documents({})
    
    # Revenue statistics
    events = await db.events.find({}, {"_id": 0, "total_revenue": 1}).to_list(10000)
    total_revenue = sum(e.get("total_revenue", 0.0) for e in events)
    platform_earnings = total_revenue * (PLATFORM_FEE_PERCENTAGE / 100)
    
    return {
        "users": {
            "total": total_users,
            "creators": total_creators,
            "viewers": total_viewers,
            "blocked": blocked_users
        },
        "events": {
            "total": total_events,
            "live": live_events,
            "blocked": blocked_events
        },
        "tickets": {
            "total": total_tickets
        },
        "revenue": {
            "total": total_revenue,
            "platform_earnings": platform_earnings
        }
    }

@api_router.get("/admin/users")
async def get_all_users(current_user: User = Depends(get_admin_user)):
    """Get all users"""
    users = await db.users.find({}, {"_id": 0}).to_list(10000)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.post("/admin/users/{user_id}/block")
async def block_user(user_id: str, reason: str, current_user: User = Depends(get_admin_user)):
    """Block a user"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_blocked": True,
            "block_reason": reason,
            "blocked_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Invalidate all user sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    
    return {"message": "User blocked successfully"}

@api_router.post("/admin/users/{user_id}/unblock")
async def unblock_user(user_id: str, current_user: User = Depends(get_admin_user)):
    """Unblock a user"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_blocked": False}, "$unset": {"block_reason": "", "blocked_at": ""}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User unblocked successfully"}

@api_router.get("/admin/events")
async def get_all_events_admin(current_user: User = Depends(get_admin_user)):
    """Get all events for admin with creator details and revenue"""
    events = await db.events.find({}, {"_id": 0}).to_list(10000)
    
    # Get all unique creator IDs
    creator_ids = list(set(e.get("creator_id") for e in events if e.get("creator_id")))
    
    # Fetch all creators in one query
    creators = await db.users.find(
        {"id": {"$in": creator_ids}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "picture": 1}
    ).to_list(10000)
    
    creator_map = {c["id"]: c for c in creators}
    
    # Get ticket counts and revenue for each event
    for event in events:
        if isinstance(event.get('created_at'), str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
        
        # Add creator info
        creator_id = event.get("creator_id")
        if creator_id and creator_id in creator_map:
            event["creator"] = creator_map[creator_id]
        else:
            event["creator"] = {"name": "Unknown", "email": ""}
        
        # Get ticket count for this event
        ticket_count = await db.tickets.count_documents({"event_id": event["id"], "refunded": False})
        event["ticket_count"] = ticket_count
        
        # Get refunded ticket count
        refunded_count = await db.tickets.count_documents({"event_id": event["id"], "refunded": True})
        event["refunded_count"] = refunded_count
        
        # Calculate platform fee and creator earnings
        total_revenue = event.get("total_revenue", 0)
        event["platform_fee"] = total_revenue * 0.20
        event["creator_earnings"] = total_revenue * 0.80
        
        # Check payout status
        payout = await db.automatic_payouts.find_one({"event_id": event["id"]}, {"_id": 0})
        event["payout_status"] = payout.get("status") if payout else "pending"
    
    return events

@api_router.post("/admin/events/{event_id}/refund-all")
async def refund_all_event_tickets(event_id: str, reason: str = "Event cancelled", current_user: User = Depends(get_admin_user)):
    """Refund all tickets for an event"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get all non-refunded tickets for this event
    tickets = await db.tickets.find(
        {"event_id": event_id, "refunded": False},
        {"_id": 0}
    ).to_list(10000)
    
    if not tickets:
        return {"message": "No tickets to refund", "refunded_count": 0, "total_amount": 0}
    
    total_refunded = 0
    refund_count = 0
    
    for ticket in tickets:
        # In production, you would process actual Stripe refunds here
        # For now, we mark them as refunded
        await db.tickets.update_one(
            {"id": ticket["id"]},
            {"$set": {
                "refunded": True,
                "refund_reason": reason,
                "refund_date": datetime.now(timezone.utc).isoformat(),
                "refunded_by": "admin"
            }}
        )
        total_refunded += ticket.get("amount_paid", 0)
        refund_count += 1
        
        # Send notification to user
        try:
            await create_notification(
                user_id=ticket["user_id"],
                notification_type="ticket_refunded",
                title="🔄 Ticket Refunded",
                message=f"Your ticket for {event['title']} has been refunded. ${ticket.get('amount_paid', 0):.2f} will be returned to your payment method.",
                event_id=event_id,
                data={
                    "event_title": event["title"],
                    "refund_amount": ticket.get("amount_paid", 0),
                    "reason": reason
                }
            )
        except Exception as e:
            logging.error(f"Failed to send refund notification: {e}")
    
    # Update event revenue
    await db.events.update_one(
        {"id": event_id},
        {"$set": {"total_revenue": 0, "status": "cancelled"}}
    )
    
    return {
        "message": "All tickets refunded successfully",
        "refunded_count": refund_count,
        "total_amount": total_refunded
    }

@api_router.post("/admin/events/{event_id}/block")
async def block_event(event_id: str, reason: str, current_user: User = Depends(get_admin_user)):
    """Block an event"""
    result = await db.events.update_one(
        {"id": event_id},
        {"$set": {
            "is_blocked": True,
            "block_reason": reason,
            "status": "cancelled"
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"message": "Event blocked successfully"}

@api_router.post("/admin/events/{event_id}/unblock")
async def unblock_event(event_id: str, current_user: User = Depends(get_admin_user)):
    """Unblock an event"""
    result = await db.events.update_one(
        {"id": event_id},
        {"$set": {"is_blocked": False}, "$unset": {"block_reason": ""}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"message": "Event unblocked successfully"}

@api_router.delete("/admin/events/{event_id}")
async def delete_event(event_id: str, current_user: User = Depends(get_admin_user)):
    """Permanently delete an event (admin only)"""
    # Check if event exists
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Delete the event
    await db.events.delete_one({"id": event_id})
    
    # Also delete related chat messages
    await db.chat_messages.delete_many({"event_id": event_id})
    
    return {"message": f"Event '{event['title']}' deleted successfully"}

@api_router.get("/admin/events/deletable")
async def get_deletable_events(current_user: User = Depends(get_admin_user)):
    """Get events that can be safely deleted (test, cancelled, completed, or paid out)"""
    # Find events that are completed, cancelled, or have "test" in the title
    events = await db.events.find({
        "$or": [
            {"status": {"$in": ["completed", "cancelled"]}},
            {"title": {"$regex": "test", "$options": "i"}},
            {"payout_processed": True}
        ]
    }, {"_id": 0}).to_list(1000)
    
    return events

# Platform About/Settings Management
class PlatformAboutInfo(BaseModel):
    description: str = "ShowMeLive is a premium virtual event platform that connects content creators with audiences worldwide."
    phone: str = ""
    email: str = "support@showmelive.com"
    socialLinks: dict = Field(default_factory=lambda: {
        "facebook": "",
        "twitter": "",
        "instagram": "",
        "youtube": ""
    })
    termsUrl: str = ""
    privacyUrl: str = ""
    termsContent: str = ""
    privacyContent: str = ""
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.get("/platform/about")
async def get_platform_about():
    """Get platform about information (public)"""
    about = await db.platform_settings.find_one({"type": "about"}, {"_id": 0})
    if not about:
        # Return defaults
        return {
            "description": "ShowMeLive is a premium virtual event platform that connects content creators with audiences worldwide. Our platform enables creators to host live events, concerts, educational sessions, and more, while providing viewers with an immersive viewing experience.",
            "phone": "",
            "email": "support@showmelive.com",
            "socialLinks": {
                "facebook": "",
                "twitter": "",
                "instagram": "",
                "youtube": ""
            },
            "termsUrl": "",
            "privacyUrl": ""
        }
    return about

@api_router.put("/admin/platform/about")
async def update_platform_about(about_info: PlatformAboutInfo, current_user: User = Depends(get_admin_user)):
    """Update platform about information (admin only)"""
    about_data = about_info.model_dump()
    about_data["type"] = "about"
    about_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    about_data["updated_by"] = current_user.email
    
    await db.platform_settings.update_one(
        {"type": "about"},
        {"$set": about_data},
        upsert=True
    )
    
    return {"message": "About information updated successfully"}

@api_router.get("/admin/tickets")
async def get_all_tickets(
    current_user: User = Depends(get_admin_user),
    skip: int = 0,
    limit: int = 100
):
    """Get all tickets with pagination"""
    # Cap limit at 500 for performance
    limit = min(limit, 500)
    
    # Get total count
    total_count = await db.tickets.count_documents({})
    
    # Get paginated tickets with only necessary fields
    tickets = await db.tickets.find(
        {},
        {"_id": 0}
    ).skip(skip).limit(limit).sort("purchase_date", -1).to_list(limit)
    
    for ticket in tickets:
        if isinstance(ticket.get('purchase_date'), str):
            ticket['purchase_date'] = datetime.fromisoformat(ticket['purchase_date'])
    
    return {
        "tickets": tickets,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }

@api_router.post("/admin/refund/{ticket_id}")
async def process_refund(ticket_id: str, reason: str, current_user: User = Depends(get_admin_user)):
    """Process refund for a ticket"""
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Mark ticket as refunded
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "refunded": True,
            "refund_reason": reason,
            "refund_date": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update event revenue
    event = await db.events.find_one({"id": ticket["event_id"]})
    if event:
        await db.events.update_one(
            {"id": ticket["event_id"]},
            {"$inc": {"total_revenue": -ticket["amount_paid"]}}
        )
    
    return {"message": "Refund processed successfully", "amount": ticket["amount_paid"]}

class PlatformBankInfo(BaseModel):
    account_name: str
    account_number: Optional[str] = ""
    routing_number: Optional[str] = ""
    bank_name: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: Optional[str] = ""

@api_router.get("/admin/bank-info")
async def get_bank_info(current_user: User = Depends(get_admin_user)):
    """Get platform bank account info"""
    bank_info = await db.platform_settings.find_one({"type": "bank_info"}, {"_id": 0})
    return bank_info or {}

@api_router.post("/admin/bank-info")
async def update_bank_info(bank_info: PlatformBankInfo, current_user: User = Depends(get_admin_user)):
    """Update platform bank account info"""
    bank_info.updated_by = current_user.id
    bank_doc = bank_info.model_dump()
    bank_doc['updated_at'] = bank_doc['updated_at'].isoformat()
    bank_doc['type'] = 'bank_info'
    
    await db.platform_settings.update_one(
        {"type": "bank_info"},
        {"$set": bank_doc},
        upsert=True
    )
    
    return {"message": "Bank info updated successfully"}

# ==================== PROMO CODES ====================

@api_router.get("/admin/promo-codes")
async def get_promo_codes(current_user: User = Depends(get_admin_user)):
    """Get all promo codes"""
    promo_codes = await db.promo_codes.find({}, {"_id": 0}).to_list(1000)
    
    # Convert datetime to string if needed
    for code in promo_codes:
        if isinstance(code.get("created_at"), datetime):
            code["created_at"] = code["created_at"].isoformat()
    
    return promo_codes

@api_router.post("/admin/promo-codes")
async def create_promo_code(promo_data: PromoCodeCreate, current_user: User = Depends(get_admin_user)):
    """Create a new promo code"""
    # Check if code already exists
    existing = await db.promo_codes.find_one({"code": promo_data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Promo code already exists")
    
    # Validate discount
    if promo_data.discount_type == "percentage" and (promo_data.discount_value < 0 or promo_data.discount_value > 100):
        raise HTTPException(status_code=400, detail="Percentage discount must be between 0 and 100")
    if promo_data.discount_type == "fixed" and promo_data.discount_value < 0:
        raise HTTPException(status_code=400, detail="Fixed discount cannot be negative")
    
    promo_code = PromoCode(
        code=promo_data.code.upper(),
        description=promo_data.description,
        discount_type=promo_data.discount_type,
        discount_value=promo_data.discount_value,
        applies_to=promo_data.applies_to,
        max_uses=promo_data.max_uses,
        min_purchase=promo_data.min_purchase,
        start_date=promo_data.start_date,
        expiration_date=promo_data.expiration_date,
        created_by=current_user.id
    )
    
    promo_doc = promo_code.model_dump()
    promo_doc["created_at"] = promo_doc["created_at"].isoformat()
    await db.promo_codes.insert_one(promo_doc)
    
    return {
        "success": True,
        "promo_code": {
            "id": promo_code.id,
            "code": promo_code.code,
            "discount_type": promo_code.discount_type,
            "discount_value": promo_code.discount_value
        }
    }

@api_router.put("/admin/promo-codes/{promo_id}")
async def update_promo_code(promo_id: str, update_data: PromoCodeUpdate, current_user: User = Depends(get_admin_user)):
    """Update a promo code"""
    promo = await db.promo_codes.find_one({"id": promo_id}, {"_id": 0})
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    update_fields = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Validate discount if being updated
    if "discount_value" in update_fields:
        dtype = update_fields.get("discount_type", promo.get("discount_type"))
        if dtype == "percentage" and (update_fields["discount_value"] < 0 or update_fields["discount_value"] > 100):
            raise HTTPException(status_code=400, detail="Percentage discount must be between 0 and 100")
    
    await db.promo_codes.update_one(
        {"id": promo_id},
        {"$set": update_fields}
    )
    
    return {"success": True, "message": "Promo code updated"}

@api_router.delete("/admin/promo-codes/{promo_id}")
async def delete_promo_code(promo_id: str, current_user: User = Depends(get_admin_user)):
    """Delete a promo code"""
    result = await db.promo_codes.delete_one({"id": promo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    return {"success": True, "message": "Promo code deleted"}

@api_router.post("/promo-codes/validate")
async def validate_promo_code(validation: PromoCodeValidate, current_user: User = Depends(get_current_user)):
    """Validate a promo code and calculate discount"""
    promo = await db.promo_codes.find_one({"code": validation.code.upper()}, {"_id": 0})
    
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid promo code")
    
    if not promo.get("is_active", True):
        raise HTTPException(status_code=400, detail="This promo code is no longer active")
    
    # Check if code applies to this purchase type
    applies_to = promo.get("applies_to", "pro_mode")
    if applies_to != "all" and applies_to != validation.purchase_type:
        raise HTTPException(status_code=400, detail=f"This promo code is not valid for {validation.purchase_type}")
    
    # Check max uses
    if promo.get("max_uses") and promo.get("current_uses", 0) >= promo["max_uses"]:
        raise HTTPException(status_code=400, detail="This promo code has reached its maximum uses")
    
    # Check minimum purchase
    if validation.purchase_amount < promo.get("min_purchase", 0):
        raise HTTPException(status_code=400, detail=f"Minimum purchase amount of ${promo['min_purchase']} required")
    
    # Check date validity
    now = datetime.now(timezone.utc).isoformat()
    
    if promo.get("start_date"):
        if now < promo["start_date"]:
            raise HTTPException(status_code=400, detail="This promo code is not yet active")
    
    if promo.get("expiration_date"):
        if now > promo["expiration_date"]:
            raise HTTPException(status_code=400, detail="This promo code has expired")
    
    # Calculate discount
    discount_type = promo.get("discount_type", "percentage")
    discount_value = promo.get("discount_value", 0)
    
    if discount_type == "percentage":
        discount_amount = validation.purchase_amount * (discount_value / 100)
    else:
        discount_amount = min(discount_value, validation.purchase_amount)
    
    final_price = max(0, validation.purchase_amount - discount_amount)
    
    return {
        "valid": True,
        "code": promo["code"],
        "description": promo.get("description", ""),
        "discount_type": discount_type,
        "discount_value": discount_value,
        "discount_amount": round(discount_amount, 2),
        "original_price": validation.purchase_amount,
        "final_price": round(final_price, 2)
    }

@api_router.post("/promo-codes/apply")
async def apply_promo_code(validation: PromoCodeValidate, current_user: User = Depends(get_current_user)):
    """Apply a promo code (increments usage count)"""
    promo = await db.promo_codes.find_one({"code": validation.code.upper()}, {"_id": 0})
    
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid promo code")
    
    # Increment usage count
    await db.promo_codes.update_one(
        {"code": validation.code.upper()},
        {"$inc": {"current_uses": 1}}
    )
    
    return {"success": True, "message": "Promo code applied"}

@api_router.get("/admin/live-monitoring")
async def get_live_monitoring(current_user: User = Depends(get_admin_user)):
    """Monitor live events and viewer connections"""
    live_events = await db.events.find({"status": "live"}, {"_id": 0}).to_list(100)
    
    monitoring_data = []
    for event in live_events:
        # Count tickets for this event
        ticket_count = await db.tickets.count_documents({"event_id": event["id"]})
        
        # Get streaming devices
        devices = await db.streaming_devices.find({"event_id": event["id"]}, {"_id": 0}).to_list(100)
        active_devices = [d for d in devices if d.get("is_active")]
        
        monitoring_data.append({
            "event": event,
            "ticket_sales": ticket_count,
            "active_cameras": len(active_devices),
            "total_cameras": len(devices)
        })
    
    return monitoring_data

# ==================== CREATOR BANK ACCOUNT & PAYOUTS ====================

class BankAccountLink(BaseModel):
    account_mask: str  # Last 4 digits
    account_name: str
    institution_name: str

class WithdrawalRequest(BaseModel):
    amount: float

class PayoutRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    creator_id: str
    amount: float
    platform_fee: float
    net_amount: float
    status: str = "pending"  # "pending", "processing", "completed", "failed"
    initiated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

@api_router.post("/creator/link-bank")
async def link_bank_account(bank_info: BankAccountLink, current_user: User = Depends(get_current_user)):
    """Link a bank account for payouts (mock implementation - real Plaid requires API keys)"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can link bank accounts")
    
    # Update user with bank info
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "bank_linked": True,
            "bank_account_mask": bank_info.account_mask,
            "bank_account_name": bank_info.account_name,
            "bank_institution": bank_info.institution_name
        }}
    )
    
    return {
        "success": True,
        "message": "Bank account linked successfully",
        "bank_account": {
            "mask": bank_info.account_mask,
            "name": bank_info.account_name,
            "institution": bank_info.institution_name
        }
    }

@api_router.get("/creator/bank-status")
async def get_bank_status(current_user: User = Depends(get_current_user)):
    """Get creator's bank account status"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can view bank status")
    
    user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    
    return {
        "bank_linked": user_doc.get("bank_linked", False),
        "bank_account": {
            "mask": user_doc.get("bank_account_mask"),
            "name": user_doc.get("bank_account_name"),
            "institution": user_doc.get("bank_institution")
        } if user_doc.get("bank_linked") else None
    }

@api_router.post("/creator/withdraw")
async def request_withdrawal(withdrawal: WithdrawalRequest, current_user: User = Depends(get_current_user)):
    """Request a withdrawal of earnings"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can request withdrawals")
    
    # Check if bank is linked
    user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    if not user_doc.get("bank_linked"):
        raise HTTPException(status_code=400, detail="Please link a bank account first")
    
    # Get available balance
    events = await db.events.find({"creator_id": current_user.id}, {"_id": 0}).to_list(1000)
    total_revenue = sum(e.get("total_revenue", 0.0) for e in events)
    platform_fee = total_revenue * (PLATFORM_FEE_PERCENTAGE / 100)
    available_balance = total_revenue - platform_fee
    
    # Check for pending payouts
    pending_payouts = await db.payouts.find({
        "creator_id": current_user.id,
        "status": {"$in": ["pending", "processing"]}
    }).to_list(100)
    pending_amount = sum(p.get("net_amount", 0) for p in pending_payouts)
    
    withdrawable = available_balance - pending_amount
    
    if withdrawal.amount > withdrawable:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient balance. Available: ${withdrawable:.2f}"
        )
    
    if withdrawal.amount < 10:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is $10")
    
    # Calculate fees
    withdrawal_fee = withdrawal.amount * 0.02  # 2% withdrawal fee
    net_amount = withdrawal.amount - withdrawal_fee
    
    # Create payout record
    payout = PayoutRecord(
        creator_id=current_user.id,
        amount=withdrawal.amount,
        platform_fee=withdrawal_fee,
        net_amount=net_amount
    )
    
    payout_doc = payout.model_dump()
    payout_doc['initiated_at'] = payout_doc['initiated_at'].isoformat()
    await db.payouts.insert_one(payout_doc)
    
    return {
        "success": True,
        "payout_id": payout.id,
        "amount_requested": withdrawal.amount,
        "withdrawal_fee": withdrawal_fee,
        "net_amount": net_amount,
        "estimated_arrival": "2-3 business days",
        "status": "pending"
    }

@api_router.get("/creator/payouts")
async def get_payout_history(current_user: User = Depends(get_current_user)):
    """Get creator's payout history"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can view payouts")
    
    payouts = await db.payouts.find(
        {"creator_id": current_user.id}, 
        {"_id": 0}
    ).sort("initiated_at", -1).to_list(100)
    
    return payouts

# ==================== CREATOR ANALYTICS ====================

@api_router.get("/creator/analytics")
async def get_creator_analytics(current_user: User = Depends(get_current_user)):
    """Get creator analytics with ticket sales trends, revenue over time, and audience data"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can view analytics")
    
    # Get creator's events with only necessary fields for analytics
    events = await db.events.find(
        {"creator_id": current_user.id},
        {"_id": 0, "id": 1, "title": 1, "category": 1, "total_revenue": 1, "image_url": 1, "date": 1}
    ).to_list(100)  # Limit to 100 most recent events
    event_ids = [e["id"] for e in events]
    
    # Use aggregation pipeline for ticket analytics (more efficient)
    ticket_pipeline = [
        {"$match": {"event_id": {"$in": event_ids}, "refunded": {"$ne": True}}},
        {"$project": {"amount_paid": 1, "purchase_date": 1, "quantity": 1, "event_id": 1}},
        {"$limit": 5000}  # Reasonable limit for analytics
    ]
    tickets = await db.tickets.aggregate(ticket_pipeline).to_list(5000)
    
    # Calculate revenue by month (last 6 months)
    from collections import defaultdict
    revenue_by_month = defaultdict(float)
    tickets_by_month = defaultdict(int)
    
    for ticket in tickets:
        purchase_date = ticket.get("purchase_date")
        if isinstance(purchase_date, str):
            try:
                purchase_date = datetime.fromisoformat(purchase_date.replace("Z", "+00:00"))
            except ValueError:
                continue
        if purchase_date:
            month_key = purchase_date.strftime("%Y-%m")
            revenue_by_month[month_key] += ticket.get("amount_paid", 0)
            tickets_by_month[month_key] += ticket.get("quantity", 1)
    
    # Sort by month and get last 6
    sorted_months = sorted(revenue_by_month.keys())[-6:]
    
    revenue_trend = [
        {"month": m, "revenue": revenue_by_month[m], "tickets": tickets_by_month[m]}
        for m in sorted_months
    ]
    
    # Category breakdown
    category_revenue = defaultdict(float)
    category_tickets = defaultdict(int)
    for event in events:
        event_tickets = [t for t in tickets if t["event_id"] == event["id"] and not t.get("refunded")]
        total = sum(t.get("amount_paid", 0) for t in event_tickets)
        count = sum(t.get("quantity", 1) for t in event_tickets)
        category_revenue[event.get("category", "Other")] += total
        category_tickets[event.get("category", "Other")] += count
    
    category_breakdown = [
        {"category": cat, "revenue": category_revenue[cat], "tickets": category_tickets[cat]}
        for cat in category_revenue.keys()
    ]
    
    # Event performance
    event_performance = []
    for event in events:
        event_tickets = [t for t in tickets if t["event_id"] == event["id"] and not t.get("refunded")]
        event_performance.append({
            "event_id": event["id"],
            "title": event.get("title", ""),
            "date": event.get("date", ""),
            "tickets_sold": sum(t.get("quantity", 1) for t in event_tickets),
            "revenue": sum(t.get("amount_paid", 0) for t in event_tickets),
            "status": event.get("status", "upcoming")
        })
    
    # Sort by revenue
    event_performance.sort(key=lambda x: x["revenue"], reverse=True)
    
    # Summary stats
    total_revenue = sum(t.get("amount_paid", 0) for t in tickets if not t.get("refunded"))
    total_tickets = sum(t.get("quantity", 1) for t in tickets if not t.get("refunded"))
    total_events = len(events)
    avg_ticket_price = total_revenue / total_tickets if total_tickets > 0 else 0
    
    return {
        "summary": {
            "total_revenue": total_revenue,
            "total_tickets_sold": total_tickets,
            "total_events": total_events,
            "avg_ticket_price": avg_ticket_price,
            "creator_share": total_revenue * 0.8  # 80% after platform fee
        },
        "revenue_trend": revenue_trend,
        "category_breakdown": category_breakdown,
        "top_events": event_performance[:5],
        "all_events": event_performance
    }

# ==================== CREATOR ONBOARDING ====================

class OnboardingProgress(BaseModel):
    step: int
    completed_steps: List[str]

@api_router.get("/creator/onboarding-status")
async def get_onboarding_status(current_user: User = Depends(get_current_user)):
    """Get creator's onboarding progress"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can view onboarding")
    
    user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    events_count = await db.events.count_documents({"creator_id": current_user.id})
    
    steps = {
        "profile_complete": bool(user_doc.get("name") and user_doc.get("email")),
        "bank_linked": user_doc.get("bank_linked", False),
        "first_event_created": events_count > 0,
        "onboarding_completed": user_doc.get("onboarding_completed", False)
    }
    
    completed_steps = [step for step, done in steps.items() if done]
    current_step = len(completed_steps)
    
    return {
        "current_step": current_step,
        "total_steps": 3,
        "steps": steps,
        "completed_steps": completed_steps,
        "is_complete": len(completed_steps) >= 3
    }

@api_router.post("/creator/complete-onboarding")
async def complete_onboarding(current_user: User = Depends(get_current_user)):
    """Mark onboarding as complete"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can complete onboarding")
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"onboarding_completed": True}}
    )
    
    return {"success": True, "message": "Onboarding completed!"}

# ==================== LIVE CHAT & REACTIONS ====================

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    user_id: str
    user_name: str
    user_picture: Optional[str] = None
    message: str
    message_type: str = "chat"  # "chat", "question", "announcement"
    is_pinned: bool = False
    is_hidden: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Reaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    user_id: str
    reaction_type: str  # "heart", "clap", "fire", "laugh", "wow"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SendMessage(BaseModel):
    message: str
    message_type: str = "chat"

class SendReaction(BaseModel):
    reaction_type: str

@api_router.get("/events/{event_id}/chat")
async def get_chat_messages(event_id: str, limit: int = 100):
    """Get chat messages for an event"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if not event.get("chat_enabled", False):
        return {"enabled": False, "messages": []}
    
    messages = await db.chat_messages.find(
        {"event_id": event_id, "is_hidden": False},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Reverse to show oldest first
    messages.reverse()
    
    # Convert datetime to string
    for msg in messages:
        if isinstance(msg.get("created_at"), datetime):
            msg["created_at"] = msg["created_at"].isoformat()
    
    return {
        "enabled": True,
        "chat_mode": event.get("chat_mode", "open"),
        "reactions_enabled": event.get("reactions_enabled", False),
        "messages": messages
    }

@api_router.post("/events/{event_id}/chat")
async def send_chat_message(event_id: str, msg: SendMessage, current_user: User = Depends(get_current_user)):
    """Send a chat message"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if not event.get("chat_enabled", False):
        raise HTTPException(status_code=400, detail="Chat is not enabled for this event")
    
    # Check chat mode restrictions
    chat_mode = event.get("chat_mode", "open")
    if chat_mode == "questions_only" and msg.message_type != "question":
        raise HTTPException(status_code=400, detail="Only questions are allowed in this chat")
    
    # Create message
    chat_message = ChatMessage(
        event_id=event_id,
        user_id=current_user.id,
        user_name=current_user.name,
        user_picture=current_user.picture,
        message=msg.message,
        message_type=msg.message_type
    )
    
    msg_doc = chat_message.model_dump()
    msg_doc['created_at'] = msg_doc['created_at'].isoformat()
    await db.chat_messages.insert_one(msg_doc)
    
    # Prepare message for response and broadcast
    message_data = {
        "id": chat_message.id,
        "user_id": current_user.id,
        "user_name": current_user.name,
        "user_picture": current_user.picture,
        "message": msg.message,
        "message_type": msg.message_type,
        "created_at": msg_doc['created_at'],
        "is_pinned": False,
        "is_hidden": False
    }
    
    # Broadcast to WebSocket connections
    await chat_manager.broadcast_to_event(event_id, {
        "type": "new_message",
        "message": message_data
    })
    
    return {
        "success": True,
        "message": message_data
    }

@api_router.post("/events/{event_id}/reactions")
async def send_reaction(event_id: str, reaction: SendReaction, current_user: User = Depends(get_current_user)):
    """Send a reaction"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if not event.get("reactions_enabled", False):
        raise HTTPException(status_code=400, detail="Reactions are not enabled for this event")
    
    valid_reactions = ["heart", "clap", "fire", "laugh", "wow"]
    if reaction.reaction_type not in valid_reactions:
        raise HTTPException(status_code=400, detail=f"Invalid reaction. Use one of: {valid_reactions}")
    
    # Create reaction
    reaction_doc = Reaction(
        event_id=event_id,
        user_id=current_user.id,
        reaction_type=reaction.reaction_type
    )
    
    doc = reaction_doc.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.reactions.insert_one(doc)
    
    # Broadcast reaction to WebSocket connections
    await chat_manager.broadcast_to_event(event_id, {
        "type": "reaction",
        "reaction_type": reaction.reaction_type,
        "user_name": current_user.name
    })
    
    return {"success": True, "reaction_type": reaction.reaction_type}

@api_router.get("/events/{event_id}/reactions/count")
async def get_reaction_counts(event_id: str):
    """Get reaction counts for an event"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Count reactions by type
    pipeline = [
        {"$match": {"event_id": event_id}},
        {"$group": {"_id": "$reaction_type", "count": {"$sum": 1}}}
    ]
    
    counts_cursor = db.reactions.aggregate(pipeline)
    counts = {item["_id"]: item["count"] async for item in counts_cursor}
    
    return {
        "reactions_enabled": event.get("reactions_enabled", False),
        "counts": counts
    }

@api_router.post("/events/{event_id}/chat/{message_id}/pin")
async def pin_message(event_id: str, message_id: str, current_user: User = Depends(get_current_user)):
    """Pin a chat message (creator only)"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Only event creator can pin messages")
    
    await db.chat_messages.update_one(
        {"id": message_id, "event_id": event_id},
        {"$set": {"is_pinned": True}}
    )
    
    return {"success": True}

@api_router.post("/events/{event_id}/chat/{message_id}/hide")
async def hide_message(event_id: str, message_id: str, current_user: User = Depends(get_current_user)):
    """Hide a chat message (creator only - for moderation)"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Only event creator can moderate messages")
    
    await db.chat_messages.update_one(
        {"id": message_id, "event_id": event_id},
        {"$set": {"is_hidden": True}}
    )
    
    return {"success": True}

@api_router.post("/events/{event_id}/announcement")
async def send_announcement(event_id: str, msg: SendMessage, current_user: User = Depends(get_current_user)):
    """Send an announcement (creator only)"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Only event creator can send announcements")
    
    chat_message = ChatMessage(
        event_id=event_id,
        user_id=current_user.id,
        user_name=current_user.name,
        user_picture=current_user.picture,
        message=msg.message,
        message_type="announcement",
        is_pinned=True
    )
    
    msg_doc = chat_message.model_dump()
    msg_doc['created_at'] = msg_doc['created_at'].isoformat()
    await db.chat_messages.insert_one(msg_doc)
    
    # Broadcast announcement via WebSocket
    await chat_manager.broadcast_to_event(event_id, {
        "type": "announcement",
        "message": {
            "id": chat_message.id,
            "user_name": current_user.name,
            "user_picture": current_user.picture,
            "message": msg.message,
            "message_type": "announcement",
            "created_at": msg_doc['created_at'],
            "is_pinned": True
        }
    })
    
    return {"success": True, "message_id": chat_message.id}

# ==================== WEBSOCKET CHAT ====================

@app.websocket("/api/ws/chat/{event_id}")
async def websocket_chat(websocket: WebSocket, event_id: str):
    """WebSocket endpoint for real-time chat"""
    # Verify event exists and chat OR reactions are enabled
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        await websocket.close(code=4004, reason="Event not found")
        return
    
    # Allow connection if either chat or reactions are enabled
    if not event.get("chat_enabled", False) and not event.get("reactions_enabled", False):
        await websocket.close(code=4003, reason="Chat and reactions not enabled for this event")
        return
    
    # Connect to the chat room
    await chat_manager.connect(websocket, event_id)
    
    try:
        # Send initial connection success and viewer count
        await websocket.send_json({
            "type": "connected",
            "event_id": event_id,
            "viewer_count": chat_manager.get_connection_count(event_id),
            "chat_mode": event.get("chat_mode", "open"),
            "reactions_enabled": event.get("reactions_enabled", False)
        })
        
        # Broadcast updated viewer count to all
        await chat_manager.broadcast_to_event(event_id, {
            "type": "viewer_count",
            "count": chat_manager.get_connection_count(event_id)
        })
        
        # Keep connection alive and listen for messages
        while True:
            # Wait for any message (ping/pong or other)
            data = await websocket.receive_text()
            
            # Handle ping
            if data == "ping":
                await websocket.send_text("pong")
            else:
                # Parse JSON messages
                try:
                    message_data = json.loads(data)
                    msg_type = message_data.get("type")
                    
                    # Handle chat messages
                    if msg_type == "message":
                        # Broadcast message to all connected clients including creator
                        await chat_manager.broadcast_to_event(event_id, {
                            "type": "message",
                            "username": message_data.get("username", "Anonymous"),
                            "message": message_data.get("message", ""),
                            "color": message_data.get("color", "#60a5fa"),
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                    
                    # Handle reactions
                    elif msg_type == "reaction":
                        # Broadcast reaction to all connected clients including creator
                        await chat_manager.broadcast_to_event(event_id, {
                            "type": "reaction",
                            "emoji": message_data.get("emoji", "👍"),
                            "username": message_data.get("username", "Anonymous"),
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                    
                    # Handle typing indicators
                    elif msg_type == "typing":
                        await chat_manager.broadcast_to_event(event_id, {
                            "type": "typing",
                            "user_name": message_data.get("user_name", "Someone")
                        })
                        
                except json.JSONDecodeError:
                    pass
                    
    except WebSocketDisconnect:
        chat_manager.disconnect(websocket, event_id)
        # Broadcast updated viewer count
        await chat_manager.broadcast_to_event(event_id, {
            "type": "viewer_count",
            "count": chat_manager.get_connection_count(event_id)
        })
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
        chat_manager.disconnect(websocket, event_id)

@api_router.get("/events/{event_id}/chat/viewers")
async def get_chat_viewer_count(event_id: str):
    """Get the number of viewers connected to the chat"""
    return {
        "event_id": event_id,
        "viewer_count": chat_manager.get_connection_count(event_id)
    }

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user), limit: int = 50):
    """Get user's notifications"""
    notifications = await db.notifications.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Convert datetime to string if needed
    for notif in notifications:
        if isinstance(notif.get("created_at"), datetime):
            notif["created_at"] = notif["created_at"].isoformat()
    
    # Count unread
    unread_count = await db.notifications.count_documents({
        "user_id": current_user.id,
        "read": False
    })
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: User = Depends(get_current_user)):
    """Get count of unread notifications"""
    count = await db.notifications.count_documents({
        "user_id": current_user.id,
        "read": False
    })
    return {"unread_count": count}

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user.id, "read": False},
        {"$set": {"read": True}}
    )
    return {"success": True}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, current_user: User = Depends(get_current_user)):
    """Delete a notification"""
    result = await db.notifications.delete_one({
        "id": notification_id,
        "user_id": current_user.id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

# Helper function to create and send notification
async def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    event_id: Optional[str] = None,
    data: Dict = {}
):
    """Create a notification and send via WebSocket if user is connected"""
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        event_id=event_id,
        data=data
    )
    
    notif_doc = notification.model_dump()
    notif_doc["created_at"] = notif_doc["created_at"].isoformat()
    await db.notifications.insert_one(notif_doc)
    
    # Send via WebSocket if user is connected
    await notification_manager.send_to_user(user_id, {
        "type": "new_notification",
        "notification": {
            "id": notification.id,
            "type": notification_type,
            "title": title,
            "message": message,
            "event_id": event_id,
            "data": data,
            "read": False,
            "created_at": notif_doc["created_at"]
        }
    })
    
    return notification

# WebSocket for real-time notifications
@app.websocket("/api/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    """WebSocket endpoint for real-time notifications"""
    # Get session token from query params
    session_token = websocket.query_params.get("token")
    
    if not session_token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    
    # Verify session
    session_doc = await db.user_sessions.find_one({
        "session_token": session_token,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    
    if not session_doc:
        await websocket.close(code=4001, reason="Invalid or expired session")
        return
    
    user_id = session_doc["user_id"]
    
    # Connect
    await notification_manager.connect(websocket, user_id)
    
    try:
        # Send initial unread count
        unread_count = await db.notifications.count_documents({
            "user_id": user_id,
            "read": False
        })
        
        await websocket.send_json({
            "type": "connected",
            "unread_count": unread_count
        })
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                
    except WebSocketDisconnect:
        notification_manager.disconnect(websocket, user_id)
    except Exception as e:
        logging.error(f"Notification WebSocket error: {e}")
        notification_manager.disconnect(websocket, user_id)

# Endpoint to set event live and notify ticket holders
@api_router.post("/events/{event_id}/go-live")
async def set_event_live(event_id: str, current_user: User = Depends(get_current_user)):
    """Set an event to live status and notify all ticket holders"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can start the event")
    
    if event.get("status") == "live":
        return {"success": True, "message": "Event is already live"}
    
    # Update event status
    await db.events.update_one(
        {"id": event_id},
        {"$set": {"status": "live"}}
    )
    
    # Get all ticket holders for this event
    tickets = await db.tickets.find(
        {"event_id": event_id, "refunded": False},
        {"_id": 0, "user_id": 1}
    ).to_list(10000)
    
    # Get unique user IDs
    user_ids = list(set(ticket["user_id"] for ticket in tickets))
    
    # Create notifications for all ticket holders
    notification_tasks = []
    for uid in user_ids:
        notification_tasks.append(
            create_notification(
                user_id=uid,
                notification_type="event_live",
                title="🎬 Your event is now LIVE!",
                message=f"{event['title']} has started! Join now to watch.",
                event_id=event_id,
                data={
                    "event_title": event["title"],
                    "event_image": event.get("image_url"),
                    "action_url": f"/event/{event_id}"
                }
            )
        )
    
    # Execute all notification tasks
    if notification_tasks:
        await asyncio.gather(*notification_tasks)
    
    logging.info(f"Event {event_id} went live. Notified {len(user_ids)} ticket holders.")
    
    return {
        "success": True,
        "message": f"Event is now live. {len(user_ids)} viewers notified.",
        "notified_count": len(user_ids)
    }

@api_router.post("/events/{event_id}/end")
async def end_event(event_id: str, current_user: User = Depends(get_current_user)):
    """End a live event"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can end the event")
    
    await db.events.update_one(
        {"id": event_id},
        {"$set": {"status": "completed"}}
    )
    
    return {"success": True, "message": "Event has ended"}

@api_router.post("/events/{event_id}/cancel")
async def cancel_event(event_id: str, reason: str = "Event cancelled by creator", current_user: User = Depends(get_current_user)):
    """Cancel an event and automatically refund all ticket holders"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can cancel the event")
    
    if event.get("status") == "cancelled":
        return {"success": False, "message": "Event is already cancelled"}
    
    if event.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed event")
    
    # Get all non-refunded tickets
    tickets = await db.tickets.find(
        {"event_id": event_id, "refunded": False},
        {"_id": 0}
    ).to_list(10000)
    
    total_refunded = 0
    refund_count = 0
    
    # Process refunds for each ticket
    for ticket in tickets:
        await db.tickets.update_one(
            {"id": ticket["id"]},
            {"$set": {
                "refunded": True,
                "refund_reason": reason,
                "refund_date": datetime.now(timezone.utc).isoformat(),
                "refunded_by": "creator_cancelled"
            }}
        )
        total_refunded += ticket.get("amount_paid", 0)
        refund_count += 1
        
        # Send notification to user
        try:
            await create_notification(
                user_id=ticket["user_id"],
                notification_type="ticket_refunded",
                title="🔄 Event Cancelled - Refund Issued",
                message=f"'{event['title']}' has been cancelled by the creator. ${ticket.get('amount_paid', 0):.2f} will be refunded to your payment method.",
                event_id=event_id,
                data={
                    "event_title": event["title"],
                    "refund_amount": ticket.get("amount_paid", 0),
                    "reason": reason
                }
            )
        except Exception as e:
            logging.error(f"Failed to send refund notification: {e}")
    
    # Update event status
    await db.events.update_one(
        {"id": event_id},
        {"$set": {
            "status": "cancelled",
            "total_revenue": 0,
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancellation_reason": reason
        }}
    )
    
    return {
        "success": True,
        "message": f"Event cancelled. {refund_count} tickets refunded.",
        "refunded_count": refund_count,
        "total_refunded": total_refunded
    }

@api_router.post("/events/{event_id}/check-geo")
async def check_geo_access(
    event_id: str, 
    user_lat: Optional[float] = None, 
    user_lon: Optional[float] = None,
    country_code: Optional[str] = None
):
    """Check if a user's location is allowed to access this event (radius-based)"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # If geo-restriction is not enabled, allow access
    if not event.get("geo_restricted", False):
        return {
            "allowed": True, 
            "message": "Event is available worldwide",
            "event_location": {
                "city": event.get("city", ""),
                "state": event.get("state", ""),
                "country": event.get("country", "")
            }
        }
    
    # Get event location
    event_lat = event.get("latitude")
    event_lon = event.get("longitude")
    geo_radius = event.get("geo_radius_meters", GEO_FENCE_RADIUS_METERS)
    
    # If event has no coordinates, fall back to allowing based on city/state match or country
    if event_lat is None or event_lon is None:
        return {
            "allowed": True,
            "message": "Event location not configured for geo-fencing. Access granted.",
            "event_location": {
                "city": event.get("city", ""),
                "state": event.get("state", ""),
                "country": event.get("country", "")
            }
        }
    
    # If user provided coordinates, check radius
    if user_lat is not None and user_lon is not None:
        distance = calculate_distance_meters(event_lat, event_lon, user_lat, user_lon)
        
        if distance <= geo_radius:
            return {
                "allowed": True,
                "message": f"You are within the event area ({int(distance)}m from venue)",
                "distance_meters": int(distance),
                "radius_meters": geo_radius,
                "event_location": {
                    "city": event.get("city", ""),
                    "state": event.get("state", ""),
                    "country": event.get("country", "")
                }
            }
        else:
            return {
                "allowed": False,
                "message": f"This event is only available within {geo_radius}m of {event.get('city', 'the venue')}, {event.get('state', '')}. You are {int(distance)}m away.",
                "distance_meters": int(distance),
                "radius_meters": geo_radius,
                "event_location": {
                    "city": event.get("city", ""),
                    "state": event.get("state", ""),
                    "country": event.get("country", "")
                }
            }
    
    # No coordinates provided - require location
    return {
        "allowed": False,
        "message": f"This event requires location access. It is only available within {geo_radius}m of {event.get('city', 'the venue')}, {event.get('state', '')}.",
        "requires_location": True,
        "radius_meters": geo_radius,
        "event_location": {
            "city": event.get("city", ""),
            "state": event.get("state", ""),
            "country": event.get("country", "")
        }
    }

@api_router.get("/events/{event_id}/geo-settings")
async def get_geo_settings(event_id: str, current_user: User = Depends(get_current_user)):
    """Get geo-fencing settings for an event (creator only)"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can view geo settings")
    
    return {
        "geo_restricted": event.get("geo_restricted", False),
        "geo_radius_meters": event.get("geo_radius_meters", GEO_FENCE_RADIUS_METERS),
        "city": event.get("city", ""),
        "state": event.get("state", ""),
        "country": event.get("country", ""),
        "latitude": event.get("latitude"),
        "longitude": event.get("longitude")
    }

@api_router.put("/events/{event_id}/geo-settings")
async def update_geo_settings(
    event_id: str,
    geo_restricted: bool = False,
    geo_radius_meters: int = 1000,
    current_user: User = Depends(get_current_user)
):
    """Update geo-fencing settings for an event (creator only)"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Only the event creator can update geo settings")
    
    await db.events.update_one(
        {"id": event_id},
        {"$set": {
            "geo_restricted": geo_restricted,
            "geo_radius_meters": geo_radius_meters
        }}
    )
    
    return {"success": True, "message": "Geo settings updated"}

# ==================== LIVEKIT STREAMING ====================

class LiveKitTokenRequest(BaseModel):
    event_id: str
    device_name: str = "Camera"
    is_publisher: bool = True

class LiveKitRoomInfo(BaseModel):
    room_name: str
    token: str
    url: str
    can_publish: bool

def generate_livekit_token(
    room_name: str,
    participant_identity: str,
    participant_name: str,
    can_publish: bool = True,
    can_subscribe: bool = True
) -> str:
    """Generate a LiveKit JWT token for room access"""
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        # Return mock token for demo when no keys configured
        return f"mock_token_{room_name}_{participant_identity}"
    
    # Create video grant
    grant = livekit_api.VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=can_publish,
        can_subscribe=can_subscribe,
        can_publish_data=True,
    )
    
    # Create access token
    token = livekit_api.AccessToken(
        LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET
    ).with_identity(
        participant_identity
    ).with_name(
        participant_name
    ).with_grants(
        grant
    ).with_ttl(
        timedelta(hours=4)
    )
    
    return token.to_jwt()

@api_router.post("/livekit/join-as-creator", response_model=LiveKitRoomInfo)
async def join_room_as_creator(
    request: LiveKitTokenRequest,
    current_user: User = Depends(get_current_user)
):
    """Get LiveKit token for creator to stream"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can stream")
    
    event = await db.events.find_one({"id": request.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the creator of this event")
    
    room_name = f"event_{request.event_id}"
    participant_id = f"creator_{current_user.id}_{request.device_name}"
    
    token = generate_livekit_token(
        room_name=room_name,
        participant_identity=participant_id,
        participant_name=f"{current_user.name} ({request.device_name})",
        can_publish=True,
        can_subscribe=True
    )
    
    # Update event status to live
    await db.events.update_one(
        {"id": request.event_id},
        {"$set": {"status": "live", "started_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return LiveKitRoomInfo(
        room_name=room_name,
        token=token,
        url=LIVEKIT_URL,
        can_publish=True
    )

@api_router.post("/livekit/join-as-viewer")
async def join_room_as_viewer(
    request: dict,
    current_user: User = Depends(get_current_user)
):
    """Get LiveKit token for viewer to watch stream"""
    event_id = request.get("event_id")
    if not event_id:
        raise HTTPException(status_code=400, detail="event_id is required")
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if LiveKit is configured
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise HTTPException(status_code=400, detail="LiveKit streaming is not configured")
    
    # Check if user has a ticket for this event
    ticket = await db.tickets.find_one({
        "event_id": event_id,
        "user_id": current_user.id,
        "refunded": {"$ne": True}
    })
    
    if not ticket and event.get("price", 0) > 0:
        raise HTTPException(status_code=403, detail="You need a ticket to watch this event")
    
    room_name = f"event_{event_id}"
    participant_id = f"viewer_{current_user.id}"
    
    token = generate_livekit_token(
        room_name=room_name,
        participant_identity=participant_id,
        participant_name=current_user.name or current_user.email,
        can_publish=False,  # Viewers can't publish
        can_subscribe=True
    )
    
    return {
        "room_name": room_name,
        "token": token,
        "url": LIVEKIT_URL,
        "can_publish": False
    }

@api_router.post("/livekit/end-stream/{event_id}")
async def end_stream(event_id: str, current_user: User = Depends(get_current_user)):
    """End a live stream"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Only event creator can end the stream")
    
    await db.events.update_one(
        {"id": event_id},
        {"$set": {
            "status": "completed",
            "ended_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Stream ended"}

@api_router.get("/livekit/stream-status/{event_id}")
async def get_stream_status(event_id: str):
    """Get current stream status and viewer count"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get viewer count from streaming devices (mock for now)
    viewer_count = await db.streaming_devices.count_documents({
        "event_id": event_id,
        "is_active": True,
        "is_control_panel": False
    })
    
    return {
        "event_id": event_id,
        "status": event.get("status", "upcoming"),
        "is_live": event.get("status") == "live",
        "viewer_count": viewer_count,
        "started_at": event.get("started_at"),
        "livekit_configured": bool(LIVEKIT_API_KEY and LIVEKIT_API_SECRET)
    }

# ==================== STRIPE CONNECT FOR CREATOR PAYOUTS ====================

@api_router.post("/stripe/connect/create-account")
async def create_stripe_connect_account(current_user: User = Depends(get_current_user)):
    """Create a Stripe Connect account for creator payouts"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can connect Stripe")
    
    try:
        # Check if user already has a Stripe account
        user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
        
        if user_doc.get("stripe_account_id"):
            # Return existing account
            return {
                "account_id": user_doc["stripe_account_id"],
                "already_exists": True
            }
        
        # Create a new Stripe Connect Express account
        account = stripe.Account.create(
            type="express",
            country="US",
            email=current_user.email,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_type="individual",
            metadata={
                "user_id": current_user.id,
                "platform": "showmelive"
            }
        )
        
        # Save the account ID to the user
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"stripe_account_id": account.id}}
        )
        
        return {
            "account_id": account.id,
            "already_exists": False
        }
        
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/stripe/connect/onboarding-link")
async def create_stripe_onboarding_link(
    origin_url: str,
    current_user: User = Depends(get_current_user)
):
    """Create a Stripe Connect onboarding link"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can onboard to Stripe")
    
    try:
        user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
        account_id = user_doc.get("stripe_account_id")
        
        if not account_id:
            # Create account first
            account_response = await create_stripe_connect_account(current_user)
            account_id = account_response["account_id"]
        
        # Create an account link for onboarding
        account_link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=f"{origin_url}/creator/settings?stripe_refresh=true",
            return_url=f"{origin_url}/creator/settings?stripe_success=true",
            type="account_onboarding",
        )
        
        return {
            "url": account_link.url,
            "expires_at": account_link.expires_at
        }
        
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/stripe/connect/status")
async def get_stripe_connect_status(current_user: User = Depends(get_current_user)):
    """Get Stripe Connect account status"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can check Stripe status")
    
    try:
        user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
        account_id = user_doc.get("stripe_account_id")
        
        if not account_id:
            return {
                "connected": False,
                "account_id": None,
                "payouts_enabled": False,
                "details_submitted": False
            }
        
        # Get account details from Stripe
        account = stripe.Account.retrieve(account_id)
        
        # Update user's bank_linked status based on Stripe
        if account.payouts_enabled:
            await db.users.update_one(
                {"id": current_user.id},
                {"$set": {
                    "bank_linked": True,
                    "bank_institution": "Stripe Connect",
                    "bank_account_name": account.business_profile.get("name") or "Connected Account",
                    "bank_account_mask": account_id[-4:]
                }}
            )
        
        return {
            "connected": True,
            "account_id": account_id,
            "payouts_enabled": account.payouts_enabled,
            "charges_enabled": account.charges_enabled,
            "details_submitted": account.details_submitted,
            "requirements": account.requirements.currently_due if account.requirements else [],
            "business_type": account.business_type,
            "country": account.country
        }
        
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/stripe/connect/payout")
async def create_stripe_payout(
    amount: float,
    current_user: User = Depends(get_current_user)
):
    """Create a payout to the creator's connected Stripe account"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can request payouts")
    
    if amount < 10:
        raise HTTPException(status_code=400, detail="Minimum payout is $10")
    
    try:
        user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
        account_id = user_doc.get("stripe_account_id")
        
        if not account_id:
            raise HTTPException(status_code=400, detail="Please connect your Stripe account first")
        
        # Check account status
        account = stripe.Account.retrieve(account_id)
        if not account.payouts_enabled:
            raise HTTPException(status_code=400, detail="Please complete your Stripe account setup to enable payouts")
        
        # Get available balance - only fetch total_revenue field
        events = await db.events.find(
            {"creator_id": current_user.id}, 
            {"_id": 0, "total_revenue": 1}
        ).to_list(1000)
        total_revenue = sum(e.get("total_revenue", 0.0) for e in events)
        platform_fee = total_revenue * (PLATFORM_FEE_PERCENTAGE / 100)
        available_balance = total_revenue - platform_fee
        
        if amount > available_balance:
            raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: ${available_balance:.2f}")
        
        # Create a transfer to the connected account
        # Note: In production, you'd transfer from your platform's Stripe balance
        transfer = stripe.Transfer.create(
            amount=int(amount * 100),  # Convert to cents
            currency="usd",
            destination=account_id,
            metadata={
                "user_id": current_user.id,
                "platform": "showmelive"
            }
        )
        
        # Record the payout
        payout_doc = {
            "id": str(uuid.uuid4()),
            "creator_id": current_user.id,
            "stripe_transfer_id": transfer.id,
            "amount": amount,
            "platform_fee": amount * 0.02,  # 2% processing fee
            "net_amount": amount * 0.98,
            "status": "completed",
            "initiated_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payouts.insert_one(payout_doc)
        
        return {
            "success": True,
            "transfer_id": transfer.id,
            "amount": amount,
            "net_amount": amount * 0.98,
            "status": "completed"
        }
        
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/stripe/connect/balance")
async def get_stripe_balance(current_user: User = Depends(get_current_user)):
    """Get creator's available balance for payout"""
    if current_user.role != "creator":
        raise HTTPException(status_code=403, detail="Only creators can check balance")
    
    # Get available balance from events - only fetch total_revenue field
    events = await db.events.find(
        {"creator_id": current_user.id}, 
        {"_id": 0, "total_revenue": 1}
    ).to_list(1000)
    total_revenue = sum(e.get("total_revenue", 0.0) for e in events)
    platform_fee = total_revenue * (PLATFORM_FEE_PERCENTAGE / 100)
    available_balance = total_revenue - platform_fee
    
    # Get pending payouts
    pending_payouts = await db.payouts.find({
        "creator_id": current_user.id,
        "status": "pending"
    }, {"_id": 0, "amount": 1}).to_list(100)
    pending_amount = sum(p.get("amount", 0) for p in pending_payouts)
    
    return {
        "total_revenue": total_revenue,
        "platform_fee": platform_fee,
        "available_balance": available_balance,
        "pending_payouts": pending_amount,
        "withdrawable": available_balance - pending_amount
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize scheduler for background tasks
scheduler = AsyncIOScheduler()

async def check_event_reminders():
    """Check for events starting in ~1 hour and send reminder notifications"""
    try:
        now = datetime.now(timezone.utc)
        one_hour_from_now = now + timedelta(hours=1)
        
        # Find events starting in the next hour (within a 10-minute window)
        window_start = one_hour_from_now - timedelta(minutes=5)
        window_end = one_hour_from_now + timedelta(minutes=5)
        
        # Get all upcoming events
        events = await db.events.find({
            "status": {"$nin": ["live", "completed", "cancelled"]},
        }, {"_id": 0}).to_list(1000)
        
        for event in events:
            try:
                # Parse event date and time
                event_date_str = event.get("date", "")
                event_time_str = event.get("time", "7:00 PM")
                
                if not event_date_str:
                    continue
                
                # Combine date and time
                datetime_str = f"{event_date_str} {event_time_str}"
                event_datetime = parser.parse(datetime_str)
                
                # Make timezone aware if not already
                if event_datetime.tzinfo is None:
                    event_datetime = event_datetime.replace(tzinfo=timezone.utc)
                
                # Check if event starts within the reminder window
                if window_start <= event_datetime <= window_end:
                    # Check if reminder was already sent
                    reminder_key = f"reminder_sent_{event['id']}"
                    existing_reminder = await db.reminder_flags.find_one({"key": reminder_key})
                    
                    if existing_reminder:
                        continue  # Already sent reminder for this event
                    
                    # Get all ticket holders for this event
                    tickets = await db.tickets.find(
                        {"event_id": event["id"], "refunded": False},
                        {"_id": 0, "user_id": 1}
                    ).to_list(10000)
                    
                    user_ids = list(set(ticket["user_id"] for ticket in tickets))
                    
                    # Send reminder notifications
                    for user_id in user_ids:
                        notification = Notification(
                            user_id=user_id,
                            type="event_reminder",
                            title="⏰ Event starting in 1 hour!",
                            message=f"{event['title']} is starting soon. Don't miss it!",
                            event_id=event["id"],
                            data={
                                "event_title": event["title"],
                                "event_image": event.get("image_url"),
                                "action_url": f"/event/{event['id']}"
                            }
                        )
                        
                        notif_doc = notification.model_dump()
                        notif_doc["created_at"] = notif_doc["created_at"].isoformat()
                        await db.notifications.insert_one(notif_doc)
                        
                        # Send via WebSocket if connected
                        await notification_manager.send_to_user(user_id, {
                            "type": "new_notification",
                            "notification": {
                                "id": notification.id,
                                "type": "event_reminder",
                                "title": notification.title,
                                "message": notification.message,
                                "event_id": event["id"],
                                "data": notification.data,
                                "read": False,
                                "created_at": notif_doc["created_at"]
                            }
                        })
                    
                    # Mark reminder as sent
                    await db.reminder_flags.insert_one({
                        "key": reminder_key,
                        "event_id": event["id"],
                        "sent_at": now.isoformat(),
                        "notified_count": len(user_ids)
                    })
                    
                    logging.info(f"Sent reminder for event {event['id']} to {len(user_ids)} users")
                    
            except Exception as e:
                logging.error(f"Error processing event {event.get('id')}: {e}")
                
    except Exception as e:
        logging.error(f"Error in check_event_reminders: {e}")

async def process_automatic_payouts():
    """Process automatic payouts 24 hours after ticket purchase"""
    try:
        now = datetime.now(timezone.utc)
        twenty_four_hours_ago = now - timedelta(hours=24)
        
        # Find all tickets purchased more than 24 hours ago that haven't been processed for payout
        tickets = await db.tickets.find({
            "refunded": False,
            "payout_processed": {"$ne": True}
        }, {"_id": 0}).to_list(10000)
        
        # Group tickets by event and creator
        event_payouts = {}
        for ticket in tickets:
            # Check if ticket was purchased more than 24 hours ago
            purchase_date = ticket.get("purchase_date")
            if isinstance(purchase_date, str):
                purchase_date = datetime.fromisoformat(purchase_date.replace("Z", "+00:00"))
            
            if purchase_date.tzinfo is None:
                purchase_date = purchase_date.replace(tzinfo=timezone.utc)
            
            if purchase_date > twenty_four_hours_ago:
                continue  # Not yet 24 hours old
            
            event_id = ticket.get("event_id")
            if event_id not in event_payouts:
                event = await db.events.find_one({"id": event_id}, {"_id": 0})
                if event:
                    event_payouts[event_id] = {
                        "event": event,
                        "creator_id": event.get("creator_id"),
                        "tickets": [],
                        "total_amount": 0
                    }
            
            if event_id in event_payouts:
                event_payouts[event_id]["tickets"].append(ticket)
                event_payouts[event_id]["total_amount"] += ticket.get("amount_paid", 0)
        
        # Process payouts for each event's creator
        for event_id, payout_data in event_payouts.items():
            creator_id = payout_data["creator_id"]
            total_amount = payout_data["total_amount"]
            
            if total_amount <= 0:
                continue
            
            # Calculate 80% for creator (20% platform fee)
            creator_amount = total_amount * 0.80
            platform_fee = total_amount * 0.20
            
            # Get creator's Stripe account
            creator = await db.users.find_one({"id": creator_id}, {"_id": 0})
            if not creator:
                logging.error(f"Creator not found: {creator_id}")
                continue
            
            stripe_account_id = creator.get("stripe_account_id")
            
            payout_record = {
                "id": str(uuid.uuid4()),
                "event_id": event_id,
                "creator_id": creator_id,
                "total_ticket_sales": total_amount,
                "platform_fee": platform_fee,
                "creator_amount": creator_amount,
                "ticket_ids": [t["id"] for t in payout_data["tickets"]],
                "status": "pending",
                "initiated_at": now.isoformat(),
                "type": "automatic_24hr"
            }
            
            if stripe_account_id:
                try:
                    # Check if Stripe account is ready for payouts
                    account = stripe.Account.retrieve(stripe_account_id)
                    
                    if account.payouts_enabled:
                        # Create transfer to creator's Stripe Connect account
                        transfer = stripe.Transfer.create(
                            amount=int(creator_amount * 100),  # Convert to cents
                            currency="usd",
                            destination=stripe_account_id,
                            metadata={
                                "event_id": event_id,
                                "creator_id": creator_id,
                                "platform": "showmelive",
                                "type": "automatic_24hr_payout"
                            }
                        )
                        
                        payout_record["stripe_transfer_id"] = transfer.id
                        payout_record["status"] = "completed"
                        payout_record["completed_at"] = now.isoformat()
                        
                        logging.info(f"Automatic payout completed: ${creator_amount:.2f} to creator {creator_id} for event {event_id}")
                        
                        # Send notification to creator
                        await create_notification(
                            user_id=creator_id,
                            notification_type="payout_completed",
                            title="💰 Payout Received!",
                            message=f"${creator_amount:.2f} has been deposited to your account for {payout_data['event']['title']}",
                            event_id=event_id,
                            data={
                                "amount": creator_amount,
                                "event_title": payout_data['event']['title']
                            }
                        )
                    else:
                        payout_record["status"] = "pending_stripe_setup"
                        payout_record["error"] = "Creator's Stripe account not ready for payouts"
                        logging.warning(f"Creator {creator_id} Stripe account not ready for payouts")
                        
                except stripe.StripeError as e:
                    payout_record["status"] = "failed"
                    payout_record["error"] = str(e)
                    logging.error(f"Stripe error for payout to creator {creator_id}: {e}")
            else:
                payout_record["status"] = "pending_stripe_setup"
                payout_record["error"] = "Creator has not connected Stripe account"
                logging.warning(f"Creator {creator_id} has not connected Stripe account")
            
            # Save payout record
            await db.automatic_payouts.insert_one(payout_record)
            
            # Mark tickets as payout processed
            for ticket in payout_data["tickets"]:
                await db.tickets.update_one(
                    {"id": ticket["id"]},
                    {"$set": {"payout_processed": True, "payout_id": payout_record["id"]}}
                )
        
        logging.info(f"Automatic payout check completed. Processed {len(event_payouts)} events.")
        
    except Exception as e:
        logging.error(f"Error in process_automatic_payouts: {e}")

@app.on_event("startup")
async def startup_event():
    """Start the background scheduler on app startup"""
    # Run reminder check every 5 minutes
    scheduler.add_job(
        check_event_reminders,
        IntervalTrigger(minutes=5),
        id="event_reminders",
        replace_existing=True
    )
    
    # Run automatic payout check every hour
    scheduler.add_job(
        process_automatic_payouts,
        IntervalTrigger(hours=1),
        id="automatic_payouts",
        replace_existing=True
    )
    
    scheduler.start()
    logging.info("Background scheduler started for event reminders and automatic payouts")

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown()
    client.close()