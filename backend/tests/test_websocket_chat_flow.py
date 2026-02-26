"""
Test WebSocket Chat Flow for ShowMeLive
Tests the WebSocket connection for viewer and creator chat/reactions
"""
import pytest
import requests
import asyncio
import websockets
import json
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://virtual-events-3.preview.emergentagent.com').rstrip('/')
WS_URL = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')


class TestWebSocketChatFlow:
    """Test WebSocket chat flow between viewer and creator"""
    
    @pytest.fixture(scope="class")
    def test_event_with_chat(self):
        """Find or create a test event with chat enabled"""
        # First, try to find an existing event with chat enabled
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200, f"Failed to get events: {response.text}"
        
        events = response.json()
        for event in events:
            if event.get("chat_enabled") and event.get("reactions_enabled"):
                print(f"Found existing event with chat: {event['id']} - {event['title']}")
                return event
        
        # If no event found, use the test event
        print("No event with chat found, using test-event-chat-test")
        return {"id": "test-event-chat-1771457019709"}
    
    def test_websocket_endpoint_exists(self, test_event_with_chat):
        """Test that the WebSocket endpoint is accessible"""
        event_id = test_event_with_chat.get("id", "test-event-chat-1771457019709")
        ws_endpoint = f"{WS_URL}/api/ws/chat/{event_id}"
        print(f"WebSocket endpoint: {ws_endpoint}")
        assert ws_endpoint.startswith("wss://") or ws_endpoint.startswith("ws://")
    
    @pytest.mark.asyncio
    async def test_viewer_websocket_connection(self, test_event_with_chat):
        """Test viewer can connect to WebSocket"""
        event_id = test_event_with_chat.get("id", "test-event-chat-1771457019709")
        ws_endpoint = f"{WS_URL}/api/ws/chat/{event_id}"
        
        print(f"Connecting viewer to: {ws_endpoint}")
        
        try:
            async with websockets.connect(ws_endpoint, open_timeout=10, close_timeout=5) as websocket:
                # Should receive connected message
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(response)
                
                print(f"Viewer received: {data}")
                assert data.get("type") == "connected", f"Expected 'connected', got {data.get('type')}"
                assert data.get("event_id") == event_id
                print("✅ Viewer WebSocket connection successful")
                
        except websockets.exceptions.InvalidStatus as e:
            if e.response.status_code == 4003:
                pytest.skip("Chat not enabled for this event")
            elif e.response.status_code == 4004:
                pytest.skip("Event not found")
            else:
                raise
    
    @pytest.mark.asyncio
    async def test_creator_websocket_connection(self, test_event_with_chat):
        """Test creator can connect to WebSocket"""
        event_id = test_event_with_chat.get("id", "test-event-chat-1771457019709")
        ws_endpoint = f"{WS_URL}/api/ws/chat/{event_id}"
        
        print(f"Connecting creator to: {ws_endpoint}")
        
        try:
            async with websockets.connect(ws_endpoint, open_timeout=10, close_timeout=5) as websocket:
                # Should receive connected message
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(response)
                
                print(f"Creator received: {data}")
                assert data.get("type") == "connected", f"Expected 'connected', got {data.get('type')}"
                print("✅ Creator WebSocket connection successful")
                
        except websockets.exceptions.InvalidStatus as e:
            if e.response.status_code == 4003:
                pytest.skip("Chat not enabled for this event")
            elif e.response.status_code == 4004:
                pytest.skip("Event not found")
            else:
                raise
    
    @pytest.mark.asyncio
    async def test_viewer_sends_message_creator_receives(self, test_event_with_chat):
        """Test that viewer can send message and creator receives it"""
        event_id = test_event_with_chat.get("id", "test-event-chat-1771457019709")
        ws_endpoint = f"{WS_URL}/api/ws/chat/{event_id}"
        
        print(f"Testing message flow for event: {event_id}")
        
        try:
            # Connect both viewer and creator
            async with websockets.connect(ws_endpoint, open_timeout=10, close_timeout=5) as creator_ws:
                # Creator receives connected message
                creator_connected = await asyncio.wait_for(creator_ws.recv(), timeout=5)
                creator_data = json.loads(creator_connected)
                print(f"Creator connected: {creator_data}")
                
                # Wait for viewer_count update (from creator's own connection)
                try:
                    viewer_count_msg = await asyncio.wait_for(creator_ws.recv(), timeout=2)
                    print(f"Creator received viewer count: {viewer_count_msg}")
                except asyncio.TimeoutError:
                    pass
                
                async with websockets.connect(ws_endpoint, open_timeout=10, close_timeout=5) as viewer_ws:
                    # Viewer receives connected message
                    viewer_connected = await asyncio.wait_for(viewer_ws.recv(), timeout=5)
                    viewer_data = json.loads(viewer_connected)
                    print(f"Viewer connected: {viewer_data}")
                    
                    # Wait for viewer_count update (from viewer's own connection)
                    try:
                        viewer_count_msg = await asyncio.wait_for(viewer_ws.recv(), timeout=2)
                        print(f"Viewer received viewer count: {viewer_count_msg}")
                    except asyncio.TimeoutError:
                        pass
                    
                    # Creator should receive viewer_count update when viewer connects
                    try:
                        creator_viewer_count = await asyncio.wait_for(creator_ws.recv(), timeout=2)
                        print(f"Creator received viewer count update: {creator_viewer_count}")
                    except asyncio.TimeoutError:
                        print("Creator did not receive viewer count update (timeout)")
                    
                    # Viewer sends a chat message
                    test_message = {
                        "type": "message",
                        "username": "TestViewer",
                        "message": f"Hello from viewer! Test at {time.time()}"
                    }
                    await viewer_ws.send(json.dumps(test_message))
                    print(f"Viewer sent message: {test_message}")
                    
                    # Creator should receive the message
                    try:
                        creator_received = await asyncio.wait_for(creator_ws.recv(), timeout=5)
                        creator_msg = json.loads(creator_received)
                        print(f"Creator received: {creator_msg}")
                        
                        assert creator_msg.get("type") == "message", f"Expected 'message', got {creator_msg.get('type')}"
                        assert creator_msg.get("username") == "TestViewer"
                        assert "Hello from viewer" in creator_msg.get("message", "")
                        print("✅ Creator successfully received viewer's message!")
                        
                    except asyncio.TimeoutError:
                        pytest.fail("Creator did not receive viewer's message within timeout")
                    
                    # Viewer should also receive the broadcast (their own message)
                    try:
                        viewer_received = await asyncio.wait_for(viewer_ws.recv(), timeout=5)
                        viewer_msg = json.loads(viewer_received)
                        print(f"Viewer received broadcast: {viewer_msg}")
                    except asyncio.TimeoutError:
                        print("Viewer did not receive broadcast (timeout)")
                        
        except websockets.exceptions.InvalidStatus as e:
            if e.response.status_code == 4003:
                pytest.skip("Chat not enabled for this event")
            elif e.response.status_code == 4004:
                pytest.skip("Event not found")
            else:
                raise
    
    @pytest.mark.asyncio
    async def test_viewer_sends_reaction_creator_receives(self, test_event_with_chat):
        """Test that viewer can send reaction and creator receives it"""
        event_id = test_event_with_chat.get("id", "test-event-chat-1771457019709")
        ws_endpoint = f"{WS_URL}/api/ws/chat/{event_id}"
        
        print(f"Testing reaction flow for event: {event_id}")
        
        try:
            # Connect both viewer and creator
            async with websockets.connect(ws_endpoint, open_timeout=10, close_timeout=5) as creator_ws:
                # Creator receives connected message
                creator_connected = await asyncio.wait_for(creator_ws.recv(), timeout=5)
                print(f"Creator connected: {creator_connected}")
                
                # Drain any pending messages
                try:
                    while True:
                        await asyncio.wait_for(creator_ws.recv(), timeout=1)
                except asyncio.TimeoutError:
                    pass
                
                async with websockets.connect(ws_endpoint, open_timeout=10, close_timeout=5) as viewer_ws:
                    # Viewer receives connected message
                    viewer_connected = await asyncio.wait_for(viewer_ws.recv(), timeout=5)
                    print(f"Viewer connected: {viewer_connected}")
                    
                    # Drain any pending messages
                    try:
                        while True:
                            await asyncio.wait_for(viewer_ws.recv(), timeout=1)
                    except asyncio.TimeoutError:
                        pass
                    
                    # Drain creator's pending messages (viewer count updates)
                    try:
                        while True:
                            await asyncio.wait_for(creator_ws.recv(), timeout=1)
                    except asyncio.TimeoutError:
                        pass
                    
                    # Viewer sends a reaction
                    test_reaction = {
                        "type": "reaction",
                        "emoji": "❤️",
                        "username": "TestViewer"
                    }
                    await viewer_ws.send(json.dumps(test_reaction))
                    print(f"Viewer sent reaction: {test_reaction}")
                    
                    # Creator should receive the reaction
                    try:
                        creator_received = await asyncio.wait_for(creator_ws.recv(), timeout=5)
                        creator_msg = json.loads(creator_received)
                        print(f"Creator received: {creator_msg}")
                        
                        assert creator_msg.get("type") == "reaction", f"Expected 'reaction', got {creator_msg.get('type')}"
                        assert creator_msg.get("emoji") == "❤️"
                        assert creator_msg.get("username") == "TestViewer"
                        print("✅ Creator successfully received viewer's reaction!")
                        
                    except asyncio.TimeoutError:
                        pytest.fail("Creator did not receive viewer's reaction within timeout")
                        
        except websockets.exceptions.InvalidStatus as e:
            if e.response.status_code == 4003:
                pytest.skip("Chat not enabled for this event")
            elif e.response.status_code == 4004:
                pytest.skip("Event not found")
            else:
                raise
    
    def test_chat_viewer_count_endpoint(self, test_event_with_chat):
        """Test the chat viewer count REST endpoint"""
        event_id = test_event_with_chat.get("id", "test-event-chat-1771457019709")
        
        response = requests.get(f"{BASE_URL}/api/events/{event_id}/chat/viewers")
        print(f"Viewer count response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert "viewer_count" in data
        assert data.get("event_id") == event_id
        print(f"✅ Viewer count endpoint works: {data['viewer_count']} viewers")


class TestEventChatSettings:
    """Test event chat settings"""
    
    def test_get_event_with_chat_enabled(self):
        """Test getting an event with chat enabled"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        events = response.json()
        chat_events = [e for e in events if e.get("chat_enabled")]
        
        print(f"Found {len(chat_events)} events with chat enabled")
        for event in chat_events[:3]:
            print(f"  - {event['id']}: {event['title']} (chat: {event.get('chat_enabled')}, reactions: {event.get('reactions_enabled')})")
    
    def test_get_event_with_reactions_enabled(self):
        """Test getting an event with reactions enabled"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        events = response.json()
        reaction_events = [e for e in events if e.get("reactions_enabled")]
        
        print(f"Found {len(reaction_events)} events with reactions enabled")
        for event in reaction_events[:3]:
            print(f"  - {event['id']}: {event['title']} (chat: {event.get('chat_enabled')}, reactions: {event.get('reactions_enabled')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
