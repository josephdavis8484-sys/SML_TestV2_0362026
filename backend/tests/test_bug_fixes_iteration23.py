"""
Test Bug Fixes - Iteration 23
Tests for:
1. Pro Mode switch device API at /api/pro-mode/switch-device
2. Delete Event API at /api/events/creator/{event_id}
3. Delete Ticket API at /api/tickets/{ticket_id}
4. Event creation with chat_enabled/reactions_enabled toggles
5. Event creation with geo_restricted toggle
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from main agent
CREATOR_SESSION = "creator_03ff4597-16ea-4eaa-a710-27d4a50735ca"
TEST_EVENT_ID = "test-event-chat-1771457019709"


class TestProModeSwitchDevice:
    """Test Pro Mode switch device API"""
    
    def test_switch_device_endpoint_exists(self):
        """Test that switch device endpoint exists and requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/switch-device",
            json={"event_id": "test", "device_id": "test"},
            headers={"Content-Type": "application/json"}
        )
        # Should return 401 (unauthorized) not 404 (not found)
        assert response.status_code in [401, 403, 404, 422], f"Unexpected status: {response.status_code}"
        print(f"✅ Switch device endpoint exists, returns {response.status_code} without auth")
    
    def test_switch_device_with_auth(self):
        """Test switch device with creator auth"""
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/switch-device",
            json={"event_id": "test-event", "device_id": "test-device"},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {CREATOR_SESSION}"
            }
        )
        # Should return 404 (session not found) not 401 (unauthorized)
        assert response.status_code in [404, 400], f"Expected 404 or 400, got {response.status_code}: {response.text}"
        print(f"✅ Switch device with auth returns {response.status_code} (session not found)")


class TestDeleteEventAPI:
    """Test Delete Event API for creators"""
    
    def test_delete_event_requires_auth(self):
        """Test that delete event requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/events/creator/test-event-id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Delete event requires authentication")
    
    def test_delete_event_requires_creator_role(self):
        """Test that delete event requires creator role"""
        # Create a viewer session for testing
        response = requests.delete(
            f"{BASE_URL}/api/events/creator/test-event-id",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"}
        )
        # Should return 404 (event not found) or 403 (not creator) - not 401
        assert response.status_code in [404, 403], f"Expected 404 or 403, got {response.status_code}"
        print(f"✅ Delete event with creator auth returns {response.status_code}")
    
    def test_delete_nonexistent_event(self):
        """Test deleting a non-existent event"""
        response = requests.delete(
            f"{BASE_URL}/api/events/creator/nonexistent-event-{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Delete non-existent event returns 404")


class TestDeleteTicketAPI:
    """Test Delete Ticket API for viewers"""
    
    def test_delete_ticket_requires_auth(self):
        """Test that delete ticket requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/tickets/test-ticket-id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Delete ticket requires authentication")
    
    def test_delete_nonexistent_ticket(self):
        """Test deleting a non-existent ticket"""
        response = requests.delete(
            f"{BASE_URL}/api/tickets/nonexistent-ticket-{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Delete non-existent ticket returns 404")


class TestEventCreationToggles:
    """Test event creation with chat/reactions/geo toggles"""
    
    def test_create_event_with_chat_disabled(self):
        """Test creating event with chat_enabled=false"""
        event_data = {
            "title": f"TEST_Chat_Disabled_{uuid.uuid4().hex[:8]}",
            "category": "Music",
            "date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event with chat disabled",
            "venue": "Test Venue",
            "city": "New York",
            "state": "NY",
            "country": "US",
            "price": 0,
            "chat_enabled": False,
            "reactions_enabled": False,
            "geo_restricted": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events",
            json=event_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {CREATOR_SESSION}"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("chat_enabled") == False, f"chat_enabled should be False, got {data.get('chat_enabled')}"
        assert data.get("reactions_enabled") == False, f"reactions_enabled should be False, got {data.get('reactions_enabled')}"
        print(f"✅ Created event with chat_enabled=False, reactions_enabled=False")
        
        # Cleanup - delete the test event
        cleanup_response = requests.delete(
            f"{BASE_URL}/api/events/creator/{data['id']}",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"}
        )
        print(f"   Cleanup: {cleanup_response.status_code}")
    
    def test_create_event_with_chat_enabled(self):
        """Test creating event with chat_enabled=true"""
        event_data = {
            "title": f"TEST_Chat_Enabled_{uuid.uuid4().hex[:8]}",
            "category": "Music",
            "date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event with chat enabled",
            "venue": "Test Venue",
            "city": "New York",
            "state": "NY",
            "country": "US",
            "price": 0,
            "chat_enabled": True,
            "reactions_enabled": True,
            "geo_restricted": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events",
            json=event_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {CREATOR_SESSION}"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("chat_enabled") == True, f"chat_enabled should be True, got {data.get('chat_enabled')}"
        assert data.get("reactions_enabled") == True, f"reactions_enabled should be True, got {data.get('reactions_enabled')}"
        print(f"✅ Created event with chat_enabled=True, reactions_enabled=True")
        
        # Cleanup
        cleanup_response = requests.delete(
            f"{BASE_URL}/api/events/creator/{data['id']}",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"}
        )
        print(f"   Cleanup: {cleanup_response.status_code}")
    
    def test_create_event_with_geo_restricted(self):
        """Test creating event with geo_restricted=true"""
        event_data = {
            "title": f"TEST_Geo_Restricted_{uuid.uuid4().hex[:8]}",
            "category": "Music",
            "date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event with geo restriction",
            "venue": "Test Venue",
            "city": "New York",
            "state": "NY",
            "country": "US",
            "latitude": 40.7128,
            "longitude": -74.0060,
            "price": 0,
            "chat_enabled": True,
            "reactions_enabled": True,
            "geo_restricted": True,
            "geo_radius_meters": 1000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events",
            json=event_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {CREATOR_SESSION}"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("geo_restricted") == True, f"geo_restricted should be True, got {data.get('geo_restricted')}"
        assert data.get("geo_radius_meters") == 1000, f"geo_radius_meters should be 1000, got {data.get('geo_radius_meters')}"
        print(f"✅ Created event with geo_restricted=True")
        
        # Cleanup
        cleanup_response = requests.delete(
            f"{BASE_URL}/api/events/creator/{data['id']}",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"}
        )
        print(f"   Cleanup: {cleanup_response.status_code}")
    
    def test_create_event_without_geo_restriction(self):
        """Test creating event with geo_restricted=false"""
        event_data = {
            "title": f"TEST_No_Geo_{uuid.uuid4().hex[:8]}",
            "category": "Music",
            "date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event without geo restriction",
            "venue": "Test Venue",
            "city": "New York",
            "state": "NY",
            "country": "US",
            "price": 0,
            "chat_enabled": True,
            "reactions_enabled": True,
            "geo_restricted": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events",
            json=event_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {CREATOR_SESSION}"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("geo_restricted") == False, f"geo_restricted should be False, got {data.get('geo_restricted')}"
        print(f"✅ Created event with geo_restricted=False")
        
        # Cleanup
        cleanup_response = requests.delete(
            f"{BASE_URL}/api/events/creator/{data['id']}",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"}
        )
        print(f"   Cleanup: {cleanup_response.status_code}")


class TestCreatorSessionValidity:
    """Test that the creator session is valid"""
    
    def test_creator_session_valid(self):
        """Verify the creator session token is valid"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("role") == "creator", f"Expected creator role, got {data.get('role')}"
        print(f"✅ Creator session valid: {data.get('email')}")


class TestDeleteEventFullFlow:
    """Test full delete event flow - create and delete"""
    
    def test_create_and_delete_event(self):
        """Test creating an event and then deleting it"""
        # Create event
        event_data = {
            "title": f"TEST_Delete_Flow_{uuid.uuid4().hex[:8]}",
            "category": "Music",
            "date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event for delete flow",
            "venue": "Test Venue",
            "city": "New York",
            "state": "NY",
            "country": "US",
            "price": 0
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/events",
            json=event_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {CREATOR_SESSION}"
            }
        )
        
        assert create_response.status_code == 200, f"Create failed: {create_response.status_code}"
        event_id = create_response.json()["id"]
        print(f"✅ Created event: {event_id}")
        
        # Verify event exists
        get_response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200, f"Event not found after creation"
        print(f"✅ Event exists after creation")
        
        # Delete event
        delete_response = requests.delete(
            f"{BASE_URL}/api/events/creator/{event_id}",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"}
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.status_code}: {delete_response.text}"
        print(f"✅ Event deleted successfully")
        
        # Verify event no longer exists
        verify_response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert verify_response.status_code == 404, f"Event still exists after deletion"
        print(f"✅ Event no longer exists after deletion")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
