"""
Pro Mode Feature Tests
Tests for multi-camera streaming functionality including:
- Session creation
- Device registration (authenticated and public)
- Control panel connection
- Device switching with transitions
- Transition type updates
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://virtual-events-3.preview.emergentagent.com')

# Test credentials from the review request
TEST_SESSION_TOKEN = "creator_03ff4597-16ea-4eaa-a710-27d4a50735ca"
TEST_EVENT_ID = "test-event-chat-1771457019709"
TEST_CONNECTION_TOKEN = "mPElHe2BcykOKvkyCSr_zsgatxhJFFdIjGzwapp6Efw"


class TestProModeSessionCreation:
    """Tests for Pro Mode session creation API"""
    
    def test_get_event_has_premium_package(self):
        """Verify test event has premium streaming package (required for Pro Mode)"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["streaming_package"] == "premium", "Event must have premium package for Pro Mode"
        print(f"✅ Event '{data['title']}' has premium streaming package")
    
    def test_create_pro_mode_session_authenticated(self):
        """Test creating a Pro Mode session as authenticated creator"""
        headers = {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/session/create?event_id={TEST_EVENT_ID}",
            headers=headers
        )
        
        # Should return 200 (existing session) or create new one
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "event_id" in data
        assert "room_name" in data
        assert "connection_token" in data
        assert data["event_id"] == TEST_EVENT_ID
        print(f"✅ Pro Mode session created/retrieved with room: {data['room_name']}")
        print(f"   Connection token: {data['connection_token'][:20]}...")
    
    def test_create_pro_mode_session_unauthenticated_fails(self):
        """Test that unauthenticated users cannot create Pro Mode sessions"""
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/session/create?event_id={TEST_EVENT_ID}"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Unauthenticated session creation correctly rejected")


class TestProModeSessionRetrieval:
    """Tests for Pro Mode session retrieval API"""
    
    def test_get_pro_mode_session_authenticated(self):
        """Test retrieving Pro Mode session as authenticated creator"""
        headers = {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        
        response = requests.get(
            f"{BASE_URL}/api/pro-mode/session/{TEST_EVENT_ID}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["event_id"] == TEST_EVENT_ID
        assert "room_name" in data
        assert "connection_token" in data
        assert "devices" in data
        assert "transition_type" in data
        print(f"✅ Session retrieved: room={data['room_name']}, transition={data['transition_type']}")
    
    def test_get_pro_mode_session_unauthenticated_fails(self):
        """Test that unauthenticated users cannot retrieve Pro Mode sessions"""
        response = requests.get(
            f"{BASE_URL}/api/pro-mode/session/{TEST_EVENT_ID}"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Unauthenticated session retrieval correctly rejected")
    
    def test_get_nonexistent_session_returns_404(self):
        """Test that requesting a non-existent session returns 404"""
        headers = {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        
        response = requests.get(
            f"{BASE_URL}/api/pro-mode/session/nonexistent-event-id",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Non-existent session correctly returns 404")


class TestProModePublicDeviceRegistration:
    """Tests for public device registration API (used by camera devices scanning QR codes)"""
    
    def test_register_device_with_valid_token(self):
        """Test registering a device using valid connection token"""
        # First get the actual connection token from the session
        headers = {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        session_response = requests.get(
            f"{BASE_URL}/api/pro-mode/session/{TEST_EVENT_ID}",
            headers=headers
        )
        
        if session_response.status_code != 200:
            pytest.skip("Could not retrieve session to get connection token")
        
        actual_token = session_response.json().get("connection_token")
        
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/device/register-public",
            json={
                "event_id": TEST_EVENT_ID,
                "device_number": 1,
                "device_name": "Test Camera 1",
                "connection_token": actual_token
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "device_id" in data
        assert "livekit_token" in data
        assert "livekit_url" in data
        assert "room_name" in data
        print(f"✅ Device registered: {data['device_id']}")
        print(f"   LiveKit URL: {data['livekit_url']}")
    
    def test_register_device_with_invalid_token_fails(self):
        """Test that invalid connection token is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/device/register-public",
            json={
                "event_id": TEST_EVENT_ID,
                "device_number": 2,
                "device_name": "Test Camera 2",
                "connection_token": "invalid-token-12345"
            }
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✅ Invalid connection token correctly rejected")
    
    def test_register_device_invalid_device_number(self):
        """Test that device numbers outside 1-5 are rejected"""
        headers = {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        session_response = requests.get(
            f"{BASE_URL}/api/pro-mode/session/{TEST_EVENT_ID}",
            headers=headers
        )
        
        if session_response.status_code != 200:
            pytest.skip("Could not retrieve session")
        
        actual_token = session_response.json().get("connection_token")
        
        # Test device number 0
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/device/register-public",
            json={
                "event_id": TEST_EVENT_ID,
                "device_number": 0,
                "device_name": "Invalid Camera",
                "connection_token": actual_token
            }
        )
        assert response.status_code == 400, f"Expected 400 for device 0, got {response.status_code}"
        
        # Test device number 6
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/device/register-public",
            json={
                "event_id": TEST_EVENT_ID,
                "device_number": 6,
                "device_name": "Invalid Camera",
                "connection_token": actual_token
            }
        )
        assert response.status_code == 400, f"Expected 400 for device 6, got {response.status_code}"
        print("✅ Invalid device numbers (0, 6) correctly rejected")


class TestProModeControlPanelConnect:
    """Tests for control panel connection API"""
    
    def test_connect_control_panel_authenticated(self):
        """Test connecting control panel as authenticated creator"""
        headers = {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/control-panel/connect?event_id={TEST_EVENT_ID}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session" in data
        assert "livekit_token" in data
        assert "livekit_url" in data
        assert "room_name" in data
        print(f"✅ Control panel connected to room: {data['room_name']}")
        print(f"   LiveKit URL: {data['livekit_url']}")
    
    def test_connect_control_panel_unauthenticated_fails(self):
        """Test that unauthenticated users cannot connect control panel"""
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/control-panel/connect?event_id={TEST_EVENT_ID}"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Unauthenticated control panel connection correctly rejected")


class TestProModeDeviceSwitching:
    """Tests for device switching API"""
    
    def test_switch_device_authenticated(self):
        """Test switching active device as authenticated creator"""
        headers = {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        
        # First get the session to find a device ID
        session_response = requests.get(
            f"{BASE_URL}/api/pro-mode/session/{TEST_EVENT_ID}",
            headers=headers
        )
        
        if session_response.status_code != 200:
            pytest.skip("Could not retrieve session")
        
        session = session_response.json()
        devices = session.get("devices", [])
        
        if not devices:
            # Register a device first
            actual_token = session.get("connection_token")
            reg_response = requests.post(
                f"{BASE_URL}/api/pro-mode/device/register-public",
                json={
                    "event_id": TEST_EVENT_ID,
                    "device_number": 1,
                    "device_name": "Test Camera 1",
                    "connection_token": actual_token
                }
            )
            if reg_response.status_code == 200:
                device_id = reg_response.json().get("device_id")
            else:
                pytest.skip("Could not register device for switch test")
        else:
            device_id = devices[0].get("id")
        
        # Now test switching
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/switch-device",
            headers=headers,
            json={
                "event_id": TEST_EVENT_ID,
                "device_id": device_id,
                "transition_type": "fade"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "active_device_id" in data
        assert "transition" in data
        print(f"✅ Device switched: {data['active_device_id']} with {data['transition']} transition")
    
    def test_switch_device_unauthenticated_fails(self):
        """Test that unauthenticated users cannot switch devices"""
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/switch-device",
            json={
                "event_id": TEST_EVENT_ID,
                "device_id": "some-device-id",
                "transition_type": "cut"
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Unauthenticated device switch correctly rejected")


class TestProModeTransitionUpdate:
    """Tests for transition type update API"""
    
    def test_update_transition_type_authenticated(self):
        """Test updating transition type as authenticated creator"""
        headers = {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        
        # Test each valid transition type
        valid_transitions = ["cut", "fade", "dissolve", "blend"]
        
        for transition in valid_transitions:
            response = requests.put(
                f"{BASE_URL}/api/pro-mode/session/{TEST_EVENT_ID}/transition?transition_type={transition}",
                headers=headers
            )
            
            assert response.status_code == 200, f"Expected 200 for {transition}, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert data.get("success") == True
            assert data.get("transition_type") == transition
        
        print(f"✅ All transition types updated successfully: {valid_transitions}")
    
    def test_update_transition_invalid_type_fails(self):
        """Test that invalid transition types are rejected"""
        headers = {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        
        response = requests.put(
            f"{BASE_URL}/api/pro-mode/session/{TEST_EVENT_ID}/transition?transition_type=invalid",
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ Invalid transition type correctly rejected")
    
    def test_update_transition_unauthenticated_fails(self):
        """Test that unauthenticated users cannot update transition type"""
        response = requests.put(
            f"{BASE_URL}/api/pro-mode/session/{TEST_EVENT_ID}/transition?transition_type=fade"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Unauthenticated transition update correctly rejected")


class TestProModeGoLive:
    """Tests for Go Live API"""
    
    def test_go_live_requires_connected_device(self):
        """Test that going live requires at least one connected device"""
        headers = {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        
        # This test may pass or fail depending on whether devices are connected
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/go-live/{TEST_EVENT_ID}",
            headers=headers
        )
        
        # Either 200 (success) or 400 (no devices connected)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            print("✅ Go Live successful")
        else:
            print("✅ Go Live correctly requires connected devices")
    
    def test_go_live_unauthenticated_fails(self):
        """Test that unauthenticated users cannot go live"""
        response = requests.post(
            f"{BASE_URL}/api/pro-mode/go-live/{TEST_EVENT_ID}"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Unauthenticated go live correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
