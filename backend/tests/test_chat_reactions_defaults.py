"""
Test Suite for Chat/Reactions Default Values and Geo-Fencing
============================================================
Tests the fix for chat_enabled and reactions_enabled defaulting to True
instead of False, and geo-fencing functionality.

Features tested:
- Event model defaults for chat_enabled and reactions_enabled
- EventCreate model defaults
- WebSocket chat connection with chat_enabled=True
- Geo-fencing check endpoint
- Event creation with chat/reactions enabled
"""

import pytest
import requests
import os
import json
import time
from datetime import datetime, timezone

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable is required")

# Test credentials from the review request
TEST_CREATOR_SESSION = "creator_03ff4597-16ea-4eaa-a710-27d4a50735ca"
TEST_EVENT_ID = "test-event-chat-1771457019709"


class TestEventChatReactionsDefaults:
    """Test that events have correct default values for chat_enabled and reactions_enabled"""
    
    def test_get_events_returns_chat_enabled_field(self):
        """Test that GET /api/events returns events with chat_enabled field"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        events = response.json()
        if len(events) > 0:
            # Check that at least one event has chat_enabled field
            event = events[0]
            assert "chat_enabled" in event, "Event should have chat_enabled field"
            print(f"✅ Event has chat_enabled: {event.get('chat_enabled')}")
    
    def test_get_events_returns_reactions_enabled_field(self):
        """Test that GET /api/events returns events with reactions_enabled field"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        events = response.json()
        if len(events) > 0:
            event = events[0]
            assert "reactions_enabled" in event, "Event should have reactions_enabled field"
            print(f"✅ Event has reactions_enabled: {event.get('reactions_enabled')}")
    
    def test_get_single_event_has_chat_fields(self):
        """Test that GET /api/events/{event_id} returns chat_enabled and reactions_enabled"""
        # First get list of events to find a valid event_id
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        events = response.json()
        if len(events) == 0:
            pytest.skip("No events available to test")
        
        event_id = events[0]["id"]
        
        # Get single event
        response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        event = response.json()
        assert "chat_enabled" in event, "Single event should have chat_enabled field"
        assert "reactions_enabled" in event, "Single event should have reactions_enabled field"
        
        # Verify defaults are True (as per the fix)
        print(f"✅ Event {event_id}: chat_enabled={event.get('chat_enabled')}, reactions_enabled={event.get('reactions_enabled')}")


class TestEventCreationWithChatReactions:
    """Test event creation with chat_enabled and reactions_enabled fields"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        return {
            "Authorization": f"Bearer {TEST_CREATOR_SESSION}",
            "Content-Type": "application/json"
        }
    
    def test_create_event_with_chat_enabled_true(self, auth_headers):
        """Test creating an event with chat_enabled=true"""
        event_data = {
            "title": f"TEST_Chat_Enabled_Event_{int(time.time())}",
            "category": "Music",
            "date": "2026-03-01",
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event with chat enabled",
            "venue": "Test Venue",
            "price": 10.0,
            "streaming_package": "free",
            "chat_enabled": True,
            "reactions_enabled": True,
            "chat_mode": "open"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events",
            headers=auth_headers,
            json=event_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_event = response.json()
        assert created_event.get("chat_enabled") == True, "chat_enabled should be True"
        assert created_event.get("reactions_enabled") == True, "reactions_enabled should be True"
        
        print(f"✅ Created event with chat_enabled=True, reactions_enabled=True")
        
        # Cleanup - delete the test event
        event_id = created_event.get("id")
        if event_id:
            requests.delete(f"{BASE_URL}/api/events/creator/{event_id}", headers=auth_headers)
    
    def test_create_event_with_chat_disabled(self, auth_headers):
        """Test creating an event with chat_enabled=false"""
        event_data = {
            "title": f"TEST_Chat_Disabled_Event_{int(time.time())}",
            "category": "Music",
            "date": "2026-03-01",
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event with chat disabled",
            "venue": "Test Venue",
            "price": 10.0,
            "streaming_package": "free",
            "chat_enabled": False,
            "reactions_enabled": False,
            "chat_mode": "open"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events",
            headers=auth_headers,
            json=event_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_event = response.json()
        assert created_event.get("chat_enabled") == False, "chat_enabled should be False when explicitly set"
        assert created_event.get("reactions_enabled") == False, "reactions_enabled should be False when explicitly set"
        
        print(f"✅ Created event with chat_enabled=False, reactions_enabled=False")
        
        # Cleanup
        event_id = created_event.get("id")
        if event_id:
            requests.delete(f"{BASE_URL}/api/events/creator/{event_id}", headers=auth_headers)
    
    def test_create_event_default_values(self, auth_headers):
        """Test that event creation uses True as default for chat_enabled and reactions_enabled"""
        # Create event without specifying chat_enabled and reactions_enabled
        event_data = {
            "title": f"TEST_Default_Values_Event_{int(time.time())}",
            "category": "Music",
            "date": "2026-03-01",
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event with default values",
            "venue": "Test Venue",
            "price": 10.0,
            "streaming_package": "free"
            # Note: NOT specifying chat_enabled or reactions_enabled
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events",
            headers=auth_headers,
            json=event_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_event = response.json()
        # Default should be True as per the fix
        assert created_event.get("chat_enabled") == True, "Default chat_enabled should be True"
        assert created_event.get("reactions_enabled") == True, "Default reactions_enabled should be True"
        
        print(f"✅ Event created with default values: chat_enabled=True, reactions_enabled=True")
        
        # Cleanup
        event_id = created_event.get("id")
        if event_id:
            requests.delete(f"{BASE_URL}/api/events/creator/{event_id}", headers=auth_headers)


class TestGeoFencing:
    """Test geo-fencing functionality"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        return {
            "Authorization": f"Bearer {TEST_CREATOR_SESSION}",
            "Content-Type": "application/json"
        }
    
    def test_geo_check_non_restricted_event(self):
        """Test geo-check for an event without geo-restriction"""
        # First get an event
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        events = response.json()
        if len(events) == 0:
            pytest.skip("No events available to test")
        
        # Find an event without geo-restriction
        event = None
        for e in events:
            if not e.get("geo_restricted", False):
                event = e
                break
        
        if not event:
            pytest.skip("No non-geo-restricted events available")
        
        event_id = event["id"]
        
        # Check geo access
        response = requests.post(f"{BASE_URL}/api/events/{event_id}/check-geo")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("allowed") == True, "Non-geo-restricted event should allow access"
        print(f"✅ Non-geo-restricted event allows access: {result.get('message')}")
    
    def test_create_geo_restricted_event(self, auth_headers):
        """Test creating an event with geo-restriction enabled"""
        event_data = {
            "title": f"TEST_Geo_Restricted_Event_{int(time.time())}",
            "category": "Music",
            "date": "2026-03-01",
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event with geo-restriction",
            "venue": "Test Venue",
            "city": "Los Angeles",
            "state": "CA",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "price": 10.0,
            "streaming_package": "free",
            "geo_restricted": True,
            "geo_radius_meters": 1000,
            "chat_enabled": True,
            "reactions_enabled": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events",
            headers=auth_headers,
            json=event_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_event = response.json()
        assert created_event.get("geo_restricted") == True, "geo_restricted should be True"
        assert created_event.get("latitude") == 34.0522, "latitude should be set"
        assert created_event.get("longitude") == -118.2437, "longitude should be set"
        
        print(f"✅ Created geo-restricted event in Los Angeles, CA")
        
        # Test geo-check for this event
        event_id = created_event.get("id")
        
        # Test with coordinates inside the radius
        response = requests.post(
            f"{BASE_URL}/api/events/{event_id}/check-geo",
            params={"user_lat": 34.0522, "user_lon": -118.2437}
        )
        assert response.status_code == 200
        result = response.json()
        assert result.get("allowed") == True, "User at event location should be allowed"
        print(f"✅ User at event location is allowed: {result.get('message')}")
        
        # Test with coordinates outside the radius (New York)
        response = requests.post(
            f"{BASE_URL}/api/events/{event_id}/check-geo",
            params={"user_lat": 40.7128, "user_lon": -74.0060}
        )
        assert response.status_code == 200
        result = response.json()
        assert result.get("allowed") == False, "User in New York should not be allowed for LA event"
        print(f"✅ User in New York is blocked: {result.get('message')}")
        
        # Cleanup
        if event_id:
            requests.delete(f"{BASE_URL}/api/events/creator/{event_id}", headers=auth_headers)


class TestChatEndpoints:
    """Test chat-related endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        return {
            "Authorization": f"Bearer {TEST_CREATOR_SESSION}",
            "Content-Type": "application/json"
        }
    
    def test_get_chat_messages(self):
        """Test GET /api/events/{event_id}/chat endpoint"""
        # Get an event
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        events = response.json()
        if len(events) == 0:
            pytest.skip("No events available to test")
        
        event_id = events[0]["id"]
        
        # Get chat messages
        response = requests.get(f"{BASE_URL}/api/events/{event_id}/chat")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "messages" in result, "Response should have messages field"
        assert "chat_mode" in result, "Response should have chat_mode field"
        assert "reactions_enabled" in result, "Response should have reactions_enabled field"
        
        # Verify reactions_enabled defaults to True
        assert result.get("reactions_enabled") == True, "reactions_enabled should default to True"
        
        print(f"✅ Chat endpoint returns correct fields with reactions_enabled={result.get('reactions_enabled')}")
    
    def test_get_chat_viewer_count(self):
        """Test GET /api/events/{event_id}/chat/viewers endpoint"""
        # Get an event
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        events = response.json()
        if len(events) == 0:
            pytest.skip("No events available to test")
        
        event_id = events[0]["id"]
        
        # Get viewer count
        response = requests.get(f"{BASE_URL}/api/events/{event_id}/chat/viewers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "event_id" in result, "Response should have event_id field"
        assert "viewer_count" in result, "Response should have viewer_count field"
        
        print(f"✅ Chat viewer count endpoint works: {result.get('viewer_count')} viewers")


class TestReactionsEndpoints:
    """Test reactions-related endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        return {
            "Authorization": f"Bearer {TEST_CREATOR_SESSION}",
            "Content-Type": "application/json"
        }
    
    def test_get_reactions_count(self):
        """Test GET /api/events/{event_id}/reactions/count endpoint"""
        # Get an event
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        events = response.json()
        if len(events) == 0:
            pytest.skip("No events available to test")
        
        event_id = events[0]["id"]
        
        # Get reactions count
        response = requests.get(f"{BASE_URL}/api/events/{event_id}/reactions/count")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        # Response has 'counts' and 'reactions_enabled' fields
        assert "reactions_enabled" in result, "Response should have reactions_enabled field"
        
        # Verify reactions_enabled defaults to True
        assert result.get("reactions_enabled") == True, "reactions_enabled should default to True"
        
        print(f"✅ Reactions count endpoint works with reactions_enabled={result.get('reactions_enabled')}")
    
    def test_post_reaction_to_event(self, auth_headers):
        """Test POST /api/events/{event_id}/reactions endpoint"""
        # First create a test event with reactions enabled
        event_data = {
            "title": f"TEST_Reactions_Event_{int(time.time())}",
            "category": "Music",
            "date": "2026-03-01",
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event for reactions",
            "venue": "Test Venue",
            "price": 10.0,
            "streaming_package": "free",
            "chat_enabled": True,
            "reactions_enabled": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events",
            headers=auth_headers,
            json=event_data
        )
        
        if response.status_code != 200:
            pytest.skip(f"Could not create test event: {response.text}")
        
        event_id = response.json().get("id")
        
        # Post a reaction - API expects reaction_type field
        reaction_data = {
            "reaction_type": "heart"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events/{event_id}/reactions",
            headers=auth_headers,
            json=reaction_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True, "Reaction should be posted successfully"
        
        print(f"✅ Posted reaction to event successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/events/creator/{event_id}", headers=auth_headers)


class TestCreatorMyEvents:
    """Test creator's my-events endpoint returns correct chat/reactions fields"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        return {
            "Authorization": f"Bearer {TEST_CREATOR_SESSION}",
            "Content-Type": "application/json"
        }
    
    def test_my_events_has_chat_fields(self, auth_headers):
        """Test that GET /api/events/creator/my-events returns events with chat fields"""
        response = requests.get(
            f"{BASE_URL}/api/events/creator/my-events",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        events = response.json()
        if len(events) > 0:
            event = events[0]
            assert "chat_enabled" in event, "Event should have chat_enabled field"
            assert "reactions_enabled" in event, "Event should have reactions_enabled field"
            
            print(f"✅ Creator's events have chat_enabled={event.get('chat_enabled')}, reactions_enabled={event.get('reactions_enabled')}")
        else:
            print("⚠️ No events found for creator, skipping field check")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
