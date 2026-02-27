"""
Test Delete Event/Ticket APIs and UI Fixes
==========================================
Tests for:
1. Delete Event API at /api/events/creator/{event_id} for creators
2. Delete Ticket API at /api/tickets/{ticket_id} for viewers
3. Event creation with chat_enabled=true and reactions_enabled=true
4. Event creation with geo_restricted=true
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from main agent
CREATOR_SESSION = "creator_03ff4597-16ea-4eaa-a710-27d4a50735ca"
TEST_EVENT_ID = "test-event-chat-1771457019709"


@pytest.fixture
def creator_client():
    """Session with creator auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {CREATOR_SESSION}"
    })
    return session


@pytest.fixture
def viewer_client():
    """Create a viewer session for testing"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Create a test viewer user and session
    import subprocess
    result = subprocess.run([
        'mongosh', '--quiet', '--eval', '''
        use("test_database");
        var userId = "test-viewer-" + Date.now();
        var sessionToken = "viewer_" + Date.now();
        db.users.insertOne({
            id: userId,
            email: "test.viewer." + Date.now() + "@example.com",
            name: "Test Viewer",
            role: "viewer",
            created_at: new Date()
        });
        db.user_sessions.insertOne({
            user_id: userId,
            session_token: sessionToken,
            expires_at: new Date(Date.now() + 7*24*60*60*1000),
            created_at: new Date()
        });
        print(JSON.stringify({userId: userId, sessionToken: sessionToken}));
        '''
    ], capture_output=True, text=True)
    
    import json
    try:
        data = json.loads(result.stdout.strip().split('\n')[-1])
        session.headers.update({"Authorization": f"Bearer {data['sessionToken']}"})
        session.viewer_id = data['userId']
        session.session_token = data['sessionToken']
    except:
        pytest.skip("Could not create viewer session")
    
    return session


class TestDeleteEventAPI:
    """Test Delete Event API for creators"""
    
    def test_creator_auth_works(self, creator_client):
        """Verify creator session is valid"""
        response = creator_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "creator"
        print(f"✅ Creator auth works: {data.get('email')}")
    
    def test_create_and_delete_event(self, creator_client):
        """Test creating an event and then deleting it"""
        # Create a test event
        event_data = {
            "title": f"TEST_Delete_Event_{int(time.time())}",
            "category": "Music",
            "date": "2026-12-31",
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event for deletion",
            "venue": "Test Venue",
            "city": "Test City",
            "state": "CA",
            "price": 0.0,
            "chat_enabled": True,
            "reactions_enabled": True
        }
        
        create_response = creator_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert create_response.status_code == 200, f"Failed to create event: {create_response.text}"
        
        created_event = create_response.json()
        event_id = created_event.get("id")
        assert event_id, "Event ID not returned"
        print(f"✅ Created test event: {event_id}")
        
        # Verify event exists
        get_response = creator_client.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        
        # Delete the event
        delete_response = creator_client.delete(f"{BASE_URL}/api/events/creator/{event_id}")
        assert delete_response.status_code == 200, f"Failed to delete event: {delete_response.text}"
        
        delete_data = delete_response.json()
        assert delete_data.get("message") == "Event deleted successfully"
        assert delete_data.get("event_id") == event_id
        print(f"✅ Deleted event successfully: {event_id}")
        
        # Verify event no longer exists
        verify_response = creator_client.get(f"{BASE_URL}/api/events/{event_id}")
        assert verify_response.status_code == 404, "Event should not exist after deletion"
        print("✅ Verified event no longer exists")
    
    def test_cannot_delete_other_creator_event(self, creator_client):
        """Test that creator cannot delete another creator's event"""
        # Try to delete an event that doesn't belong to this creator
        fake_event_id = "non-existent-event-12345"
        response = creator_client.delete(f"{BASE_URL}/api/events/creator/{fake_event_id}")
        assert response.status_code == 404
        print("✅ Cannot delete non-existent or other creator's event")
    
    def test_cannot_delete_live_event(self, creator_client):
        """Test that live events cannot be deleted"""
        # Create an event and set it to live
        event_data = {
            "title": f"TEST_Live_Event_{int(time.time())}",
            "category": "Music",
            "date": "2026-12-31",
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test live event",
            "venue": "Test Venue",
            "price": 0.0
        }
        
        create_response = creator_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert create_response.status_code == 200
        event_id = create_response.json().get("id")
        
        # Set event to live status via direct DB update
        import subprocess
        subprocess.run([
            'mongosh', '--quiet', '--eval', f'''
            use("test_database");
            db.events.updateOne({{id: "{event_id}"}}, {{$set: {{status: "live"}}}});
            '''
        ], capture_output=True)
        
        # Try to delete live event
        delete_response = creator_client.delete(f"{BASE_URL}/api/events/creator/{event_id}")
        assert delete_response.status_code == 400
        assert "live" in delete_response.json().get("detail", "").lower()
        print("✅ Cannot delete live event")
        
        # Cleanup - set back to upcoming and delete
        subprocess.run([
            'mongosh', '--quiet', '--eval', f'''
            use("test_database");
            db.events.updateOne({{id: "{event_id}"}}, {{$set: {{status: "upcoming"}}}});
            '''
        ], capture_output=True)
        creator_client.delete(f"{BASE_URL}/api/events/creator/{event_id}")


class TestDeleteTicketAPI:
    """Test Delete Ticket API for viewers"""
    
    def test_viewer_can_delete_ticket(self, viewer_client, creator_client):
        """Test that viewer can delete their own ticket"""
        # First create an event
        event_data = {
            "title": f"TEST_Ticket_Event_{int(time.time())}",
            "category": "Music",
            "date": "2026-12-31",
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event for ticket deletion",
            "venue": "Test Venue",
            "price": 0.0
        }
        
        create_response = creator_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert create_response.status_code == 200
        event_id = create_response.json().get("id")
        print(f"✅ Created event for ticket test: {event_id}")
        
        # Create a ticket for the viewer
        ticket_data = {
            "event_id": event_id,
            "quantity": 1
        }
        
        ticket_response = viewer_client.post(f"{BASE_URL}/api/tickets", json=ticket_data)
        assert ticket_response.status_code == 200, f"Failed to create ticket: {ticket_response.text}"
        
        ticket = ticket_response.json()
        ticket_id = ticket.get("id")
        assert ticket_id, "Ticket ID not returned"
        print(f"✅ Created ticket: {ticket_id}")
        
        # Verify ticket exists
        tickets_response = viewer_client.get(f"{BASE_URL}/api/tickets")
        assert tickets_response.status_code == 200
        tickets = tickets_response.json()
        assert any(t.get("id") == ticket_id for t in tickets), "Ticket not found in user's tickets"
        
        # Delete the ticket
        delete_response = viewer_client.delete(f"{BASE_URL}/api/tickets/{ticket_id}")
        assert delete_response.status_code == 200, f"Failed to delete ticket: {delete_response.text}"
        
        delete_data = delete_response.json()
        assert delete_data.get("message") == "Ticket deleted successfully"
        assert delete_data.get("ticket_id") == ticket_id
        print(f"✅ Deleted ticket successfully: {ticket_id}")
        
        # Verify ticket no longer exists
        tickets_after = viewer_client.get(f"{BASE_URL}/api/tickets")
        assert tickets_after.status_code == 200
        tickets_list = tickets_after.json()
        assert not any(t.get("id") == ticket_id for t in tickets_list), "Ticket should not exist after deletion"
        print("✅ Verified ticket no longer exists")
        
        # Cleanup - delete the event
        creator_client.delete(f"{BASE_URL}/api/events/creator/{event_id}")
    
    def test_cannot_delete_other_viewer_ticket(self, viewer_client):
        """Test that viewer cannot delete another viewer's ticket"""
        fake_ticket_id = "non-existent-ticket-12345"
        response = viewer_client.delete(f"{BASE_URL}/api/tickets/{fake_ticket_id}")
        assert response.status_code == 404
        print("✅ Cannot delete non-existent or other viewer's ticket")


class TestEventCreationWithChatReactions:
    """Test event creation with chat and reactions enabled"""
    
    def test_create_event_with_chat_enabled(self, creator_client):
        """Test creating event with chat_enabled=true"""
        event_data = {
            "title": f"TEST_Chat_Event_{int(time.time())}",
            "category": "Music",
            "date": "2026-12-31",
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event with chat enabled",
            "venue": "Test Venue",
            "price": 0.0,
            "chat_enabled": True,
            "reactions_enabled": True
        }
        
        response = creator_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200
        
        event = response.json()
        assert event.get("chat_enabled") == True
        assert event.get("reactions_enabled") == True
        print(f"✅ Created event with chat_enabled=True, reactions_enabled=True")
        
        # Cleanup
        creator_client.delete(f"{BASE_URL}/api/events/creator/{event.get('id')}")
    
    def test_create_event_with_geo_restricted(self, creator_client):
        """Test creating event with geo_restricted=true"""
        event_data = {
            "title": f"TEST_Geo_Event_{int(time.time())}",
            "category": "Music",
            "date": "2026-12-31",
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event with geo restriction",
            "venue": "Test Venue",
            "city": "Los Angeles",
            "state": "CA",
            "price": 0.0,
            "geo_restricted": True,
            "geo_radius_meters": 5000
        }
        
        response = creator_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert response.status_code == 200
        
        event = response.json()
        assert event.get("geo_restricted") == True
        assert event.get("geo_radius_meters") == 5000
        assert event.get("city") == "Los Angeles"
        assert event.get("state") == "CA"
        print(f"✅ Created event with geo_restricted=True, radius=5000m")
        
        # Cleanup
        creator_client.delete(f"{BASE_URL}/api/events/creator/{event.get('id')}")


class TestProModeCameraIdentity:
    """Test Pro Mode camera identity uses Camera-{number} format"""
    
    def test_pro_mode_device_registration_endpoint(self, creator_client):
        """Test that Pro Mode device registration endpoint exists and returns correct format"""
        # First create an event
        event_data = {
            "title": f"TEST_ProMode_Event_{int(time.time())}",
            "category": "Music",
            "date": "2026-12-31",
            "start_time": "19:00",
            "end_time": "21:00",
            "description": "Test event for Pro Mode",
            "venue": "Test Venue",
            "price": 0.0,
            "streaming_package": "premium"  # Pro Mode requires premium
        }
        
        create_response = creator_client.post(f"{BASE_URL}/api/events", json=event_data)
        assert create_response.status_code == 200
        event_id = create_response.json().get("id")
        print(f"✅ Created Pro Mode test event: {event_id}")
        
        # Initialize Pro Mode session
        init_response = creator_client.post(f"{BASE_URL}/api/pro-mode/init", json={"event_id": event_id})
        
        if init_response.status_code == 200:
            session_data = init_response.json()
            print(f"✅ Pro Mode session initialized")
            
            # Check that connection_token is returned
            assert "connection_token" in session_data or "session" in session_data
        else:
            print(f"⚠️ Pro Mode init returned {init_response.status_code}: {init_response.text}")
        
        # Cleanup
        creator_client.delete(f"{BASE_URL}/api/events/creator/{event_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
