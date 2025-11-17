from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Constants
SESSION_DURATION_DAYS = 7
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
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
    title: str
    category: str
    image_url: str
    date: str
    description: str
    venue: str
    price: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    title: str
    category: str
    image_url: str
    date: str
    description: str
    venue: str
    price: float

class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    user_id: str
    quantity: int
    purchase_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketCreate(BaseModel):
    event_id: str
    quantity: int

class SessionRequest(BaseModel):
    session_id: str

# Auth Helper Functions
async def get_session_token(request: Request) -> Optional[str]:
    """Extract session token from cookie or Authorization header"""
    # Try cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        return session_token
    
    # Fallback to Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "")
    
    return None

async def get_current_user(request: Request) -> User:
    """Get current authenticated user"""
    session_token = await get_session_token(request)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check session validity
    session_doc = await db.user_sessions.find_one({
        "session_token": session_token,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    # Get user
    user_doc = await db.users.find_one({"id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert ISO string timestamps back to datetime
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# Auth Routes
@api_router.post("/auth/session")
async def create_session(session_req: SessionRequest, response: Response):
    """Exchange session_id for session_token and user data"""
    try:
        # Call Emergent Auth API
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                EMERGENT_AUTH_URL,
                headers={"X-Session-ID": session_req.session_id},
                timeout=10.0
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session ID")
            
            auth_data = resp.json()
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["id"]
            user = User(**existing_user)
        else:
            # Create new user
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
        
        # Create session
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
        
        # Set httpOnly cookie
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
    """Get current user info"""
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = await get_session_token(request)
    
    if session_token:
        # Delete session from database
        await db.user_sessions.delete_one({"session_token": session_token})
    
    # Clear cookie
    response.delete_cookie(key="session_token", path="/")
    
    return {"message": "Logged out successfully"}

# Event Routes
@api_router.get("/events", response_model=List[Event])
async def get_events():
    """Get all events"""
    events = await db.events.find({}, {"_id": 0}).to_list(1000)
    
    for event in events:
        if isinstance(event.get('created_at'), str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
    
    return events

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    """Get event by ID"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if isinstance(event.get('created_at'), str):
        event['created_at'] = datetime.fromisoformat(event['created_at'])
    
    return Event(**event)

@api_router.get("/events/category/{category}", response_model=List[Event])
async def get_events_by_category(category: str):
    """Get events by category"""
    events = await db.events.find({"category": category}, {"_id": 0}).to_list(1000)
    
    for event in events:
        if isinstance(event.get('created_at'), str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
    
    return events

@api_router.post("/events", response_model=Event)
async def create_event(event_input: EventCreate, current_user: User = Depends(get_current_user)):
    """Create new event (authenticated)"""
    event = Event(**event_input.model_dump())
    
    event_doc = event.model_dump()
    event_doc['created_at'] = event_doc['created_at'].isoformat()
    
    await db.events.insert_one(event_doc)
    
    return event

# Ticket Routes
@api_router.get("/tickets", response_model=List[Ticket])
async def get_my_tickets(current_user: User = Depends(get_current_user)):
    """Get current user's tickets"""
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
    
    ticket = Ticket(
        event_id=ticket_input.event_id,
        user_id=current_user.id,
        quantity=ticket_input.quantity
    )
    
    ticket_doc = ticket.model_dump()
    ticket_doc['purchase_date'] = ticket_doc['purchase_date'].isoformat()
    
    await db.tickets.insert_one(ticket_doc)
    
    return ticket

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()