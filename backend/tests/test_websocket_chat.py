"""
Test suite for WebSocket Chat, Role Selection, and Stripe Dashboard Link features
"""
import pytest
import requests
import os
import asyncio
import websockets
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://creator-stage-1.preview.emergentagent.com').rstrip('/')

# Test credentials created in MongoDB
CREATOR_SESSION_TOKEN = "test_session_ws_1771457045752"
CREATOR_USER_ID = "test-creator-ws-1771457045752"
EVENT_ID = "test-event-chat-1771457045762"


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_auth_me_with_valid_session(self):
        """Test /api/auth/me returns user data with valid session"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == CREATOR_USER_ID
        assert data["role"] == "creator"
        print(f"✓ Auth endpoint returns user: {data['email']}")
    
    def test_auth_me_without_session(self):
        """Test /api/auth/me returns 401 without session"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Auth endpoint returns 401 without session")


class TestChatEndpoints:
    """Test chat REST API endpoints"""
    
    def test_get_chat_messages(self):
        """Test GET /api/events/{event_id}/chat returns messages"""
        response = requests.get(f"{BASE_URL}/api/events/{EVENT_ID}/chat")
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] == True
        assert data["chat_mode"] == "open"
        assert data["reactions_enabled"] == True
        assert "messages" in data
        print(f"✓ Chat endpoint returns {len(data['messages'])} messages")
    
    def test_send_chat_message(self):
        """Test POST /api/events/{event_id}/chat sends message"""
        response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/chat",
            headers={
                "Authorization": f"Bearer {CREATOR_SESSION_TOKEN}",
                "Content-Type": "application/json"
            },
            json={"message": "Test message from pytest", "message_type": "chat"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["message"]["message"] == "Test message from pytest"
        print(f"✓ Chat message sent successfully: {data['message']['id']}")
    
    def test_send_chat_message_requires_auth(self):
        """Test POST /api/events/{event_id}/chat requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/chat",
            headers={"Content-Type": "application/json"},
            json={"message": "Test", "message_type": "chat"}
        )
        assert response.status_code == 401
        print("✓ Chat message requires authentication")
    
    def test_get_viewer_count(self):
        """Test GET /api/events/{event_id}/chat/viewers returns count"""
        response = requests.get(f"{BASE_URL}/api/events/{EVENT_ID}/chat/viewers")
        assert response.status_code == 200
        data = response.json()
        assert "viewer_count" in data
        assert data["event_id"] == EVENT_ID
        print(f"✓ Viewer count endpoint returns: {data['viewer_count']}")


class TestReactionEndpoints:
    """Test reaction REST API endpoints"""
    
    def test_send_reaction(self):
        """Test POST /api/events/{event_id}/reactions sends reaction"""
        response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/reactions",
            headers={
                "Authorization": f"Bearer {CREATOR_SESSION_TOKEN}",
                "Content-Type": "application/json"
            },
            json={"reaction_type": "fire"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["reaction_type"] == "fire"
        print("✓ Reaction sent successfully")
    
    def test_get_reaction_counts(self):
        """Test GET /api/events/{event_id}/reactions/count returns counts"""
        response = requests.get(f"{BASE_URL}/api/events/{EVENT_ID}/reactions/count")
        assert response.status_code == 200
        data = response.json()
        assert data["reactions_enabled"] == True
        assert "counts" in data
        print(f"✓ Reaction counts: {data['counts']}")
    
    def test_invalid_reaction_type(self):
        """Test invalid reaction type returns error"""
        response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_ID}/reactions",
            headers={
                "Authorization": f"Bearer {CREATOR_SESSION_TOKEN}",
                "Content-Type": "application/json"
            },
            json={"reaction_type": "invalid"}
        )
        assert response.status_code == 400
        print("✓ Invalid reaction type returns 400")


class TestEventEndpoints:
    """Test event endpoints"""
    
    def test_get_events(self):
        """Test GET /api/events returns events list"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Events endpoint returns {len(data)} events")
    
    def test_get_event_with_chat_enabled(self):
        """Test GET /api/events/{event_id} returns event with chat settings"""
        response = requests.get(f"{BASE_URL}/api/events/{EVENT_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == EVENT_ID
        assert data["chat_enabled"] == True
        assert data["reactions_enabled"] == True
        assert data["chat_mode"] == "open"
        print(f"✓ Event has chat_enabled={data['chat_enabled']}, reactions_enabled={data['reactions_enabled']}")


class TestStripeConnectEndpoints:
    """Test Stripe Connect endpoints for Creator Settings"""
    
    def test_stripe_connect_status(self):
        """Test GET /api/stripe/connect/status returns status"""
        response = requests.get(
            f"{BASE_URL}/api/stripe/connect/status",
            headers={"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        print(f"✓ Stripe connect status: connected={data['connected']}")
    
    def test_stripe_connect_status_requires_auth(self):
        """Test Stripe connect status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/stripe/connect/status")
        assert response.status_code == 401
        print("✓ Stripe connect status requires authentication")


class TestWebSocketChat:
    """Test WebSocket chat functionality"""
    
    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """Test WebSocket connection to chat"""
        ws_url = f"wss://livestream-hub-76.preview.emergentagent.com/api/ws/chat/{EVENT_ID}"
        
        async with websockets.connect(ws_url) as websocket:
            # Wait for initial message
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(response)
            
            assert data["type"] == "connected"
            assert data["event_id"] == EVENT_ID
            assert "viewer_count" in data
            assert data["chat_mode"] == "open"
            assert data["reactions_enabled"] == True
            print(f"✓ WebSocket connected, viewer_count={data['viewer_count']}")
    
    @pytest.mark.asyncio
    async def test_websocket_ping_pong(self):
        """Test WebSocket ping/pong"""
        ws_url = f"wss://livestream-hub-76.preview.emergentagent.com/api/ws/chat/{EVENT_ID}"
        
        async with websockets.connect(ws_url) as websocket:
            # Skip initial connected message
            await websocket.recv()
            # Skip viewer_count broadcast
            await websocket.recv()
            
            # Send ping
            await websocket.send("ping")
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            
            assert response == "pong"
            print("✓ WebSocket ping/pong working")
    
    @pytest.mark.asyncio
    async def test_websocket_viewer_count_broadcast(self):
        """Test WebSocket broadcasts viewer count on connect"""
        ws_url = f"wss://livestream-hub-76.preview.emergentagent.com/api/ws/chat/{EVENT_ID}"
        
        async with websockets.connect(ws_url) as websocket:
            # Get initial connected message
            response1 = await asyncio.wait_for(websocket.recv(), timeout=5)
            data1 = json.loads(response1)
            assert data1["type"] == "connected"
            
            # Get viewer count broadcast
            response2 = await asyncio.wait_for(websocket.recv(), timeout=5)
            data2 = json.loads(response2)
            assert data2["type"] == "viewer_count"
            assert "count" in data2
            print(f"✓ Viewer count broadcast received: {data2['count']}")
    
    @pytest.mark.asyncio
    async def test_websocket_invalid_event(self):
        """Test WebSocket closes for invalid event"""
        ws_url = f"wss://livestream-hub-76.preview.emergentagent.com/api/ws/chat/invalid-event-id"
        
        try:
            async with websockets.connect(ws_url) as websocket:
                await websocket.recv()
                pytest.fail("Should have closed connection")
        except websockets.exceptions.ConnectionClosed as e:
            assert e.code == 4004
            print("✓ WebSocket closes with 4004 for invalid event")
        except websockets.exceptions.InvalidStatus as e:
            # Server may reject with HTTP 403 before WebSocket handshake completes
            assert e.response.status_code in [403, 404]
            print(f"✓ WebSocket rejected with HTTP {e.response.status_code} for invalid event")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
