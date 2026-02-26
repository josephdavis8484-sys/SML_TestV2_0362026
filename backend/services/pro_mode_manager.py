"""Pro Mode WebSocket connection manager for ShowMeLive"""
import logging
from typing import Dict, Optional
from fastapi import WebSocket
from models.pro_mode import ProModeDevice, ProModeSession


class ProModeConnectionManager:
    """Manages WebSocket connections for Pro Mode multi-camera streaming"""
    
    def __init__(self):
        # event_id -> {device_id -> WebSocket}
        self.device_connections: Dict[str, Dict[str, WebSocket]] = {}
        # event_id -> control_panel WebSocket
        self.control_panels: Dict[str, WebSocket] = {}
        # event_id -> ProModeSession
        self.sessions: Dict[str, ProModeSession] = {}
    
    async def register_device(self, event_id: str, device: ProModeDevice, websocket: WebSocket):
        """Register a camera device"""
        if event_id not in self.device_connections:
            self.device_connections[event_id] = {}
        self.device_connections[event_id][device.id] = websocket
        logging.info(f"Pro Mode: Device {device.device_number} registered for event {event_id}")
    
    async def register_control_panel(self, event_id: str, websocket: WebSocket):
        """Register the control panel"""
        self.control_panels[event_id] = websocket
        logging.info(f"Pro Mode: Control panel registered for event {event_id}")
    
    def disconnect_device(self, event_id: str, device_id: str):
        """Disconnect a camera device"""
        if event_id in self.device_connections and device_id in self.device_connections[event_id]:
            del self.device_connections[event_id][device_id]
            if len(self.device_connections[event_id]) == 0:
                del self.device_connections[event_id]
        logging.info(f"Pro Mode: Device {device_id} disconnected from event {event_id}")
    
    def disconnect_control_panel(self, event_id: str):
        """Disconnect the control panel"""
        if event_id in self.control_panels:
            del self.control_panels[event_id]
        logging.info(f"Pro Mode: Control panel disconnected from event {event_id}")
    
    async def notify_control_panel(self, event_id: str, message: dict):
        """Send a message to the control panel"""
        if event_id in self.control_panels:
            try:
                await self.control_panels[event_id].send_json(message)
            except Exception as e:
                logging.error(f"Pro Mode: Error notifying control panel: {e}")
                self.disconnect_control_panel(event_id)
    
    async def notify_device(self, event_id: str, device_id: str, message: dict):
        """Send a message to a specific device"""
        if event_id in self.device_connections and device_id in self.device_connections[event_id]:
            try:
                await self.device_connections[event_id][device_id].send_json(message)
            except Exception as e:
                logging.error(f"Pro Mode: Error notifying device {device_id}: {e}")
                self.disconnect_device(event_id, device_id)
    
    async def broadcast_to_devices(self, event_id: str, message: dict, exclude_device_id: Optional[str] = None):
        """Broadcast a message to all devices"""
        if event_id in self.device_connections:
            for device_id, websocket in list(self.device_connections[event_id].items()):
                if device_id != exclude_device_id:
                    try:
                        await websocket.send_json(message)
                    except Exception as e:
                        logging.error(f"Pro Mode: Error broadcasting to device {device_id}: {e}")
                        self.disconnect_device(event_id, device_id)
    
    def get_connected_devices(self, event_id: str) -> list:
        """Get list of connected device IDs"""
        return list(self.device_connections.get(event_id, {}).keys())
    
    def is_control_panel_connected(self, event_id: str) -> bool:
        """Check if control panel is connected"""
        return event_id in self.control_panels
