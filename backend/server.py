from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends, UploadFile, File
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Constants
SESSION_DURATION_DAYS = 7
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
STREAMING_PACKAGES = {"free": 0.0, "premium": 1000.0}
PLATFORM_FEE_PERCENTAGE = 20
PAYOUT_DELAY_HOURS = 24

# Upload directory
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    role: Optional[str] = None  # "viewer" or "creator"
    stripe_account_id: Optional[str] = None
    bank_linked: bool = False
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
    time: str = "7:00 PM"  # Default time
    description: str
    venue: str
    price: float
    streaming_package: str = "free"  # "free" or "premium"
    stream_url: Optional[str] = None
    qr_code: Optional[str] = None
    share_link: Optional[str] = None
    status: str = "upcoming"  # "upcoming", "live", "completed"
    total_revenue: float = 0.0
    payout_processed: bool = False
    payout_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    title: str
    category: str
    date: str
    time: str
    description: str
    venue: str
    price: float
    streaming_package: str = "free"

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
    amount_paid: float
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
    events = await db.events.find({"status": "upcoming"}, {"_id": 0}).to_list(1000)
    for event in events:
        if isinstance(event.get('created_at'), str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
    return events

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
    share_link = f"{os.environ.get('FRONTEND_URL', 'https://showmakeover.preview.emergentagent.com')}/event/{event_id}"
    
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
    device_url = f"{os.environ.get('FRONTEND_URL', 'https://showmakeover.preview.emergentagent.com')}/stream/{device_token}"
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
    except Exception as e:
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
    
    webhook_response = await stripe_checkout.handle_webhook(body, signature)
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()