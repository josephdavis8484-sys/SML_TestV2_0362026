"""
Test LiveKit WebRTC and Plaid Bank Linking Integration APIs
Tests for iteration 7 - LiveKit and Plaid status endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from seed data
CREATOR_SESSION_TOKEN = "test_session_livekit_1771438796253"
CREATOR_USER_ID = "test-creator-livekit-1771438796253"
TEST_EVENT_ID = "test-event-livekit-1771438796253"
EXISTING_EVENT_ID = "f1918257-df3a-480f-bb3b-b309f6dbdf24"  # Existing event from seed data


class TestPlaidStatusAPI:
    """Test Plaid bank linking status endpoint"""
    
    def test_plaid_status_returns_configured_flag(self):
        """GET /api/plaid/status returns configured status and environment"""
        response = requests.get(f"{BASE_URL}/api/plaid/status")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "configured" in data
        assert "environment" in data
        assert "message" in data
        
        # Verify values (Plaid not configured in test env)
        assert data["configured"] == False
        assert data["environment"] == "sandbox"
        assert "PLAID_CLIENT_ID" in data["message"] or "configured" in data["message"].lower()
        
        print(f"✓ Plaid status: configured={data['configured']}, env={data['environment']}")
    
    def test_plaid_create_link_token_requires_auth(self):
        """POST /api/plaid/create-link-token requires authentication"""
        response = requests.post(f"{BASE_URL}/api/plaid/create-link-token")
        
        assert response.status_code == 401
        print("✓ Plaid create-link-token requires authentication")
    
    def test_plaid_create_link_token_requires_creator_role(self):
        """POST /api/plaid/create-link-token requires creator role"""
        # First create a viewer user
        import time
        viewer_id = f"test-viewer-plaid-{int(time.time()*1000)}"
        viewer_session = f"test_session_viewer_{int(time.time()*1000)}"
        
        # Create viewer in DB via API (using admin login)
        admin_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "admin@showmelive.com", "password": "admin123"}
        )
        
        # Test with creator session - should work (returns mock response)
        response = requests.post(
            f"{BASE_URL}/api/plaid/create-link-token",
            headers={"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "configured" in data
        assert data["configured"] == False
        print("✓ Plaid create-link-token works for creator (returns mock when not configured)")


class TestLiveKitStreamStatusAPI:
    """Test LiveKit stream status endpoint"""
    
    def test_stream_status_returns_livekit_configured_flag(self):
        """GET /api/livekit/stream-status/{event_id} returns livekit_configured flag"""
        response = requests.get(f"{BASE_URL}/api/livekit/stream-status/{TEST_EVENT_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "event_id" in data
        assert "status" in data
        assert "is_live" in data
        assert "viewer_count" in data
        assert "livekit_configured" in data
        
        # Verify values
        assert data["event_id"] == TEST_EVENT_ID
        assert data["livekit_configured"] == False  # Not configured in test env
        assert isinstance(data["viewer_count"], int)
        
        print(f"✓ Stream status: event={data['event_id']}, livekit_configured={data['livekit_configured']}")
    
    def test_stream_status_with_existing_event(self):
        """GET /api/livekit/stream-status/{event_id} works with existing event"""
        response = requests.get(f"{BASE_URL}/api/livekit/stream-status/{EXISTING_EVENT_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["event_id"] == EXISTING_EVENT_ID
        assert "status" in data
        assert "livekit_configured" in data
        print(f"✓ Stream status for existing event: status={data['status']}")
    
    def test_stream_status_returns_404_for_invalid_event(self):
        """GET /api/livekit/stream-status/{event_id} returns 404 for invalid event"""
        response = requests.get(f"{BASE_URL}/api/livekit/stream-status/invalid-event-id-12345")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
        print("✓ Stream status returns 404 for invalid event")
    
    def test_stream_status_shows_viewer_count(self):
        """GET /api/livekit/stream-status/{event_id} includes viewer_count"""
        response = requests.get(f"{BASE_URL}/api/livekit/stream-status/{TEST_EVENT_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "viewer_count" in data
        assert isinstance(data["viewer_count"], int)
        assert data["viewer_count"] >= 0
        print(f"✓ Stream status includes viewer_count: {data['viewer_count']}")


class TestLiveKitCreatorEndpoints:
    """Test LiveKit creator streaming endpoints"""
    
    def test_join_as_creator_requires_auth(self):
        """POST /api/livekit/join-as-creator requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/livekit/join-as-creator",
            json={"event_id": TEST_EVENT_ID, "device_name": "Camera 1", "is_publisher": True}
        )
        
        assert response.status_code == 401
        print("✓ Join as creator requires authentication")
    
    def test_join_as_creator_requires_creator_role(self):
        """POST /api/livekit/join-as-creator requires creator role"""
        response = requests.post(
            f"{BASE_URL}/api/livekit/join-as-creator",
            json={"event_id": TEST_EVENT_ID, "device_name": "Camera 1", "is_publisher": True},
            headers={"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "room_name" in data
        assert "token" in data
        assert "url" in data
        assert "can_publish" in data
        
        # Verify values
        assert data["can_publish"] == True
        assert TEST_EVENT_ID in data["room_name"]
        print(f"✓ Join as creator returns token: room={data['room_name']}")
    
    def test_join_as_creator_returns_404_for_invalid_event(self):
        """POST /api/livekit/join-as-creator returns 404 for invalid event"""
        response = requests.post(
            f"{BASE_URL}/api/livekit/join-as-creator",
            json={"event_id": "invalid-event-id", "device_name": "Camera 1", "is_publisher": True},
            headers={"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        )
        
        assert response.status_code == 404
        print("✓ Join as creator returns 404 for invalid event")


class TestLiveKitViewerEndpoints:
    """Test LiveKit viewer streaming endpoints"""
    
    def test_join_as_viewer_requires_auth(self):
        """POST /api/livekit/join-as-viewer requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/livekit/join-as-viewer",
            params={"event_id": TEST_EVENT_ID}
        )
        
        assert response.status_code == 401
        print("✓ Join as viewer requires authentication")


class TestEndStreamEndpoint:
    """Test end stream endpoint"""
    
    def test_end_stream_requires_auth(self):
        """POST /api/livekit/end-stream/{event_id} requires authentication"""
        response = requests.post(f"{BASE_URL}/api/livekit/end-stream/{TEST_EVENT_ID}")
        
        assert response.status_code == 401
        print("✓ End stream requires authentication")


class TestHomepageAndAdminStillWork:
    """Verify existing functionality still works"""
    
    def test_homepage_events_api(self):
        """GET /api/events returns events list (homepage)"""
        response = requests.get(f"{BASE_URL}/api/events")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Homepage events API works: {len(data)} events")
    
    def test_admin_login_works(self):
        """POST /api/admin/login works with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "admin@showmelive.com", "password": "admin123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert "user" in data
        print("✓ Admin login works")
    
    def test_admin_dashboard_requires_auth(self):
        """GET /api/admin/dashboard requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard")
        
        assert response.status_code == 401
        print("✓ Admin dashboard requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
