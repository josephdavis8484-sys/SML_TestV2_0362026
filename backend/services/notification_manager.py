"""Notification WebSocket connection manager for ShowMeLive"""
import logging
from typing import Dict, Set
from fastapi import WebSocket


class NotificationConnectionManager:
    """Manages WebSocket connections for real-time notifications"""
    
    def __init__(self):
        # user_id -> set of connected websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Connect a user for notifications"""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logging.info(f"Notifications: User {user_id} connected")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Disconnect a user from notifications"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if len(self.active_connections[user_id]) == 0:
                del self.active_connections[user_id]
        logging.info(f"Notifications: User {user_id} disconnected")
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send a notification to a specific user"""
        if user_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logging.error(f"Notifications: Error sending to user {user_id}: {e}")
                    dead_connections.append(connection)
            
            # Clean up dead connections
            for dead in dead_connections:
                self.disconnect(dead, user_id)
    
    async def broadcast_to_users(self, user_ids: list, message: dict):
        """Send a notification to multiple users"""
        for user_id in user_ids:
            await self.send_to_user(user_id, message)
