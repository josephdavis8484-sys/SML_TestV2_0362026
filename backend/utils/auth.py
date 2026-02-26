"""Authentication utilities for ShowMeLive"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import Request, HTTPException, Depends
from database import db
from models.user import User
from config import ADMIN_EMAIL


async def get_session_token(request: Request) -> Optional[str]:
    """Extract session token from cookies or headers"""
    # Try cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        return session_token
    
    # Try Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "")
    
    return None


async def get_current_user(request: Request) -> User:
    """Get the current authenticated user from session token"""
    session_token = await get_session_token(request)
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session = await db.user_sessions.find_one({
        "session_token": session_token,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    # Find user
    user_doc = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check if blocked
    if user_doc.get("is_blocked"):
        raise HTTPException(status_code=403, detail=f"Account blocked: {user_doc.get('block_reason', 'Contact support')}")
    
    return User(**user_doc)


async def get_admin_user(request: Request) -> User:
    """Get the current user and verify they are an admin"""
    session_token = await get_session_token(request)
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check for admin session
    if session_token.startswith("admin_"):
        session = await db.user_sessions.find_one({
            "session_token": session_token,
            "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
        })
        
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired admin session")
        
        user_doc = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="Admin user not found")
        
        if user_doc.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        return User(**user_doc)
    
    raise HTTPException(status_code=403, detail="Admin access required")
