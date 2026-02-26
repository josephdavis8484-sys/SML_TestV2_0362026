"""Chat WebSocket connection manager for ShowMeLive"""
import logging
from typing import Dict, Set
from fastapi import WebSocket


class ChatConnectionManager:
    """Manages WebSocket connections for live chat"""
    
    def __init__(self):
        # event_id -> set of connected websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # websocket -> user_info
        self.user_info: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket, event_id: str, user_info: dict):
        """Connect a user to an event's chat room"""
        await websocket.accept()
        if event_id not in self.active_connections:
            self.active_connections[event_id] = set()
        self.active_connections[event_id].add(websocket)
        self.user_info[websocket] = {"event_id": event_id, **user_info}
        logging.info(f"Chat: User {user_info.get('name', 'Unknown')} connected to event {event_id}")
    
    def disconnect(self, websocket: WebSocket, event_id: str):
        """Disconnect a user from an event's chat room"""
        if event_id in self.active_connections:
            self.active_connections[event_id].discard(websocket)
            if len(self.active_connections[event_id]) == 0:
                del self.active_connections[event_id]
        if websocket in self.user_info:
            del self.user_info[websocket]
        logging.info(f"Chat: User disconnected from event {event_id}")
    
    async def broadcast(self, event_id: str, message: dict, exclude: WebSocket = None):
        """Broadcast a message to all users in an event's chat room"""
        if event_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[event_id]:
                if connection != exclude:
                    try:
                        await connection.send_json(message)
                    except Exception as e:
                        logging.error(f"Chat: Error broadcasting to connection: {e}")
                        dead_connections.append(connection)
            
            # Clean up dead connections
            for dead in dead_connections:
                self.disconnect(dead, event_id)
    
    def get_viewer_count(self, event_id: str) -> int:
        """Get the number of connected viewers for an event"""
        return len(self.active_connections.get(event_id, set()))
    
    def get_connected_users(self, event_id: str) -> list:
        """Get list of connected users for an event"""
        users = []
        if event_id in self.active_connections:
            for ws in self.active_connections[event_id]:
                if ws in self.user_info:
                    users.append({
                        "name": self.user_info[ws].get("name", "Anonymous"),
                        "role": self.user_info[ws].get("role", "viewer")
                    })
        return users
