"""
Test LiveKit WebRTC Configuration - Iteration 8
Tests that LiveKit is now fully configured with real API keys
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://virtual-events-2.preview.emergentagent.com').rstrip('/')

# Test credentials from previous iterations
ADMIN_EMAIL = "admin@showmelive.com"
ADMIN_PASSWORD = "admin123"
CREATOR_SESSION_TOKEN = "test_session_livekit_1771438796253"
TEST_EVENT_ID = "test-event-livekit-1771438796253"


class TestLiveKitConfiguration:
    """Tests for LiveKit WebRTC configuration"""
    
    def test_stream_status_returns_livekit_configured_true(self):
        """GET /api/livekit/stream-status/{event_id} should return livekit_configured: true"""
        response = requests.get(f"{BASE_URL}/api/livekit/stream-status/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "livekit_configured" in data
        assert data["livekit_configured"] == True, "LiveKit should be configured with real API keys"
        assert "event_id" in data
        assert "status" in data
        assert "is_live" in data
        assert "viewer_count" in data
    
    def test_stream_status_for_different_event(self):
        """Verify livekit_configured is true for any event"""
        # Use a different event ID
        response = requests.get(f"{BASE_URL}/api/livekit/stream-status/f1918257-df3a-480f-bb3b-b309f6dbdf24")
        assert response.status_code == 200
        
        data = response.json()
        assert data["livekit_configured"] == True
    
    def test_stream_status_returns_404_for_invalid_event(self):
        """GET /api/livekit/stream-status/{invalid_id} should return 404"""
        response = requests.get(f"{BASE_URL}/api/livekit/stream-status/invalid-event-id-12345")
        assert response.status_code == 404


class TestLiveKitTokenGeneration:
    """Tests for LiveKit JWT token generation"""
    
    def test_join_as_creator_requires_auth(self):
        """POST /api/livekit/join-as-creator requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/livekit/join-as-creator",
            json={"event_id": TEST_EVENT_ID, "device_name": "Test", "is_publisher": True}
        )
        assert response.status_code == 401
    
    def test_join_as_creator_returns_real_jwt_token(self):
        """POST /api/livekit/join-as-creator should return real JWT token (not mock)"""
        response = requests.post(
            f"{BASE_URL}/api/livekit/join-as-creator",
            headers={"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"},
            json={"event_id": TEST_EVENT_ID, "device_name": "Test Camera", "is_publisher": True}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "room_name" in data
        assert "url" in data
        assert "can_publish" in data
        
        # Verify token is a real JWT (starts with eyJ) not a mock token
        token = data["token"]
        assert token.startswith("eyJ"), f"Token should be a real JWT, got: {token[:50]}..."
        assert not token.startswith("mock_"), "Token should not be a mock token"
        
        # Verify LiveKit URL is the real cloud URL
        assert data["url"] == "wss://showmelive-4y2wqa4p.livekit.cloud"
        assert data["can_publish"] == True
    
    def test_join_as_viewer_requires_auth(self):
        """POST /api/livekit/join-as-viewer requires authentication"""
        response = requests.post(f"{BASE_URL}/api/livekit/join-as-viewer?event_id={TEST_EVENT_ID}")
        assert response.status_code == 401
    
    def test_end_stream_requires_auth(self):
        """POST /api/livekit/end-stream/{event_id} requires authentication"""
        response = requests.post(f"{BASE_URL}/api/livekit/end-stream/{TEST_EVENT_ID}")
        assert response.status_code == 401


class TestHomepageAndEvents:
    """Tests for homepage and events API"""
    
    def test_events_list_returns_200(self):
        """GET /api/events should return list of events"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one event"
    
    def test_event_detail_returns_200(self):
        """GET /api/events/{event_id} should return event details"""
        response = requests.get(f"{BASE_URL}/api/events/f1918257-df3a-480f-bb3b-b309f6dbdf24")
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "title" in data
        assert "category" in data


class TestAdminPanel:
    """Tests for admin panel functionality"""
    
    def test_admin_login_works(self):
        """POST /api/admin/login should work with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "session_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
    
    def test_admin_dashboard_requires_auth(self):
        """GET /api/admin/dashboard requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard")
        assert response.status_code == 401
    
    def test_admin_dashboard_returns_stats(self):
        """GET /api/admin/dashboard should return platform statistics"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        admin_token = login_response.json()["session_token"]
        
        # Then get dashboard
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "users" in data
        assert "events" in data
        assert "tickets" in data
        assert "revenue" in data


class TestPlaidStatus:
    """Tests for Plaid bank linking status"""
    
    def test_plaid_status_returns_not_configured(self):
        """GET /api/plaid/status should return configured=false (still needs API keys)"""
        response = requests.get(f"{BASE_URL}/api/plaid/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "configured" in data
        # Plaid is still not configured (needs API keys)
        assert data["configured"] == False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
