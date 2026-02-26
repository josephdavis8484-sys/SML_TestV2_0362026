"""
Test suite for Notification System
Tests: GET /api/notifications, GET /api/notifications/unread-count, 
POST /api/notifications/{id}/read, POST /api/notifications/read-all,
DELETE /api/notifications/{id}, POST /api/events/{event_id}/go-live,
POST /api/events/{event_id}/end, WebSocket /api/ws/notifications
"""
import pytest
import requests
import os
import time
import json
from datetime import datetime, timezone, timedelta
import subprocess

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://virtual-events-3.preview.emergentagent.com').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = "TEST_NOTIF_"
TIMESTAMP = str(int(time.time() * 1000))

# Test user credentials
CREATOR_USER_ID = f"test-creator-notif-{TIMESTAMP}"
CREATOR_SESSION_TOKEN = f"test_session_creator_notif_{TIMESTAMP}"
VIEWER_USER_ID = f"test-viewer-notif-{TIMESTAMP}"
VIEWER_SESSION_TOKEN = f"test_session_viewer_notif_{TIMESTAMP}"
TEST_EVENT_ID = f"test-event-notif-{TIMESTAMP}"


def setup_module(module):
    """Create test users, sessions, event, and ticket before tests"""
    # Create creator user
    subprocess.run([
        "mongosh", "--quiet", "--eval", f"""
        use('test_database');
        db.users.insertOne({{
            id: '{CREATOR_USER_ID}',
            email: 'creator.notif.{TIMESTAMP}@test.com',
            name: 'Test Creator Notif',
            role: 'creator',
            created_at: new Date().toISOString()
        }});
        db.user_sessions.insertOne({{
            user_id: '{CREATOR_USER_ID}',
            session_token: '{CREATOR_SESSION_TOKEN}',
            expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
            created_at: new Date().toISOString()
        }});
        """
    ], capture_output=True)
    
    # Create viewer user
    subprocess.run([
        "mongosh", "--quiet", "--eval", f"""
        use('test_database');
        db.users.insertOne({{
            id: '{VIEWER_USER_ID}',
            email: 'viewer.notif.{TIMESTAMP}@test.com',
            name: 'Test Viewer Notif',
            role: 'viewer',
            created_at: new Date().toISOString()
        }});
        db.user_sessions.insertOne({{
            user_id: '{VIEWER_USER_ID}',
            session_token: '{VIEWER_SESSION_TOKEN}',
            expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
            created_at: new Date().toISOString()
        }});
        """
    ], capture_output=True)
    
    # Create test event
    subprocess.run([
        "mongosh", "--quiet", "--eval", f"""
        use('test_database');
        db.events.insertOne({{
            id: '{TEST_EVENT_ID}',
            creator_id: '{CREATOR_USER_ID}',
            title: 'Test Event for Notifications',
            category: 'Music',
            image_url: 'https://example.com/image.jpg',
            date: 'January 30, 2026',
            time: '8:00 PM',
            description: 'Test event for notification testing',
            venue: 'Test Venue',
            price: 25.0,
            streaming_package: 'free',
            status: 'upcoming',
            chat_enabled: true,
            reactions_enabled: true,
            created_at: new Date().toISOString()
        }});
        """
    ], capture_output=True)
    
    # Create ticket for viewer (so they get notified when event goes live)
    subprocess.run([
        "mongosh", "--quiet", "--eval", f"""
        use('test_database');
        db.tickets.insertOne({{
            id: 'test-ticket-notif-{TIMESTAMP}',
            event_id: '{TEST_EVENT_ID}',
            user_id: '{VIEWER_USER_ID}',
            quantity: 1,
            amount_paid: 25.0,
            refunded: false,
            purchase_date: new Date().toISOString()
        }});
        """
    ], capture_output=True)
    
    print(f"Test setup complete. Creator: {CREATOR_USER_ID}, Viewer: {VIEWER_USER_ID}, Event: {TEST_EVENT_ID}")


def teardown_module(module):
    """Clean up test data after tests"""
    subprocess.run([
        "mongosh", "--quiet", "--eval", f"""
        use('test_database');
        db.users.deleteMany({{ id: {{ $in: ['{CREATOR_USER_ID}', '{VIEWER_USER_ID}'] }} }});
        db.user_sessions.deleteMany({{ session_token: {{ $in: ['{CREATOR_SESSION_TOKEN}', '{VIEWER_SESSION_TOKEN}'] }} }});
        db.events.deleteMany({{ id: '{TEST_EVENT_ID}' }});
        db.tickets.deleteMany({{ event_id: '{TEST_EVENT_ID}' }});
        db.notifications.deleteMany({{ event_id: '{TEST_EVENT_ID}' }});
        """
    ], capture_output=True)
    print("Test cleanup complete")


class TestNotificationEndpoints:
    """Test notification CRUD endpoints"""
    
    def test_get_notifications_requires_auth(self):
        """GET /api/notifications requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401
        print("✓ GET /api/notifications returns 401 without auth")
    
    def test_get_notifications_with_auth(self):
        """GET /api/notifications returns notifications for authenticated user"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        assert isinstance(data["notifications"], list)
        assert isinstance(data["unread_count"], int)
        print(f"✓ GET /api/notifications returns {len(data['notifications'])} notifications, {data['unread_count']} unread")
    
    def test_get_unread_count_requires_auth(self):
        """GET /api/notifications/unread-count requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count")
        assert response.status_code == 401
        print("✓ GET /api/notifications/unread-count returns 401 without auth")
    
    def test_get_unread_count_with_auth(self):
        """GET /api/notifications/unread-count returns count for authenticated user"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
        print(f"✓ GET /api/notifications/unread-count returns {data['unread_count']}")


class TestGoLiveNotifications:
    """Test go-live endpoint and notification creation"""
    
    def test_go_live_requires_auth(self):
        """POST /api/events/{event_id}/go-live requires authentication"""
        response = requests.post(f"{BASE_URL}/api/events/{TEST_EVENT_ID}/go-live")
        assert response.status_code == 401
        print("✓ POST /api/events/{event_id}/go-live returns 401 without auth")
    
    def test_go_live_requires_creator(self):
        """POST /api/events/{event_id}/go-live requires event creator"""
        response = requests.post(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/go-live",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        assert response.status_code == 403
        print("✓ POST /api/events/{event_id}/go-live returns 403 for non-creator")
    
    def test_go_live_success(self):
        """POST /api/events/{event_id}/go-live sets event to live and notifies ticket holders"""
        response = requests.post(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/go-live",
            headers={"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "notified_count" in data
        assert data["notified_count"] >= 1  # At least the viewer should be notified
        print(f"✓ POST /api/events/{TEST_EVENT_ID}/go-live succeeded, notified {data['notified_count']} viewers")
        
        # Verify event status changed to live
        event_response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert event_response.status_code == 200
        event_data = event_response.json()
        assert event_data["status"] == "live"
        print("✓ Event status changed to 'live'")
    
    def test_go_live_already_live(self):
        """POST /api/events/{event_id}/go-live returns success if already live"""
        response = requests.post(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/go-live",
            headers={"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ POST /api/events/{event_id}/go-live handles already live event")
    
    def test_viewer_received_notification(self):
        """Viewer should have received notification when event went live"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find the event_live notification
        live_notifications = [n for n in data["notifications"] if n["type"] == "event_live" and n["event_id"] == TEST_EVENT_ID]
        assert len(live_notifications) >= 1, "Viewer should have received event_live notification"
        
        notif = live_notifications[0]
        assert notif["title"] == "🎬 Your event is now LIVE!"
        assert "Test Event for Notifications" in notif["message"]
        assert notif["read"] == False
        assert notif["data"]["action_url"] == f"/event/{TEST_EVENT_ID}"
        print(f"✓ Viewer received event_live notification: {notif['title']}")
        
        # Store notification ID for later tests
        TestGoLiveNotifications.notification_id = notif["id"]


class TestNotificationActions:
    """Test notification read/delete actions"""
    
    def test_mark_notification_read(self):
        """POST /api/notifications/{id}/read marks notification as read"""
        notif_id = getattr(TestGoLiveNotifications, 'notification_id', None)
        if not notif_id:
            pytest.skip("No notification ID from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/{notif_id}/read",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ POST /api/notifications/{notif_id}/read succeeded")
        
        # Verify notification is now read
        notif_response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        notifications = notif_response.json()["notifications"]
        notif = next((n for n in notifications if n["id"] == notif_id), None)
        assert notif is not None
        assert notif["read"] == True
        print("✓ Notification marked as read")
    
    def test_mark_notification_read_not_found(self):
        """POST /api/notifications/{id}/read returns 404 for non-existent notification"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/non-existent-id/read",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        assert response.status_code == 404
        print("✓ POST /api/notifications/{id}/read returns 404 for non-existent notification")
    
    def test_mark_all_read(self):
        """POST /api/notifications/read-all marks all notifications as read"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/read-all",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ POST /api/notifications/read-all succeeded")
        
        # Verify unread count is 0
        count_response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        assert count_response.json()["unread_count"] == 0
        print("✓ All notifications marked as read (unread_count = 0)")
    
    def test_delete_notification(self):
        """DELETE /api/notifications/{id} deletes a notification"""
        notif_id = getattr(TestGoLiveNotifications, 'notification_id', None)
        if not notif_id:
            pytest.skip("No notification ID from previous test")
        
        response = requests.delete(
            f"{BASE_URL}/api/notifications/{notif_id}",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ DELETE /api/notifications/{notif_id} succeeded")
        
        # Verify notification is deleted
        notif_response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        notifications = notif_response.json()["notifications"]
        notif = next((n for n in notifications if n["id"] == notif_id), None)
        assert notif is None
        print("✓ Notification deleted successfully")
    
    def test_delete_notification_not_found(self):
        """DELETE /api/notifications/{id} returns 404 for non-existent notification"""
        response = requests.delete(
            f"{BASE_URL}/api/notifications/non-existent-id",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        assert response.status_code == 404
        print("✓ DELETE /api/notifications/{id} returns 404 for non-existent notification")


class TestEndEvent:
    """Test end event endpoint"""
    
    def test_end_event_requires_auth(self):
        """POST /api/events/{event_id}/end requires authentication"""
        response = requests.post(f"{BASE_URL}/api/events/{TEST_EVENT_ID}/end")
        assert response.status_code == 401
        print("✓ POST /api/events/{event_id}/end returns 401 without auth")
    
    def test_end_event_requires_creator(self):
        """POST /api/events/{event_id}/end requires event creator"""
        response = requests.post(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/end",
            headers={"Authorization": f"Bearer {VIEWER_SESSION_TOKEN}"}
        )
        assert response.status_code == 403
        print("✓ POST /api/events/{event_id}/end returns 403 for non-creator")
    
    def test_end_event_success(self):
        """POST /api/events/{event_id}/end sets event status to completed"""
        response = requests.post(
            f"{BASE_URL}/api/events/{TEST_EVENT_ID}/end",
            headers={"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ POST /api/events/{TEST_EVENT_ID}/end succeeded")
        
        # Verify event status changed to completed
        event_response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}")
        assert event_response.status_code == 200
        event_data = event_response.json()
        assert event_data["status"] == "completed"
        print("✓ Event status changed to 'completed'")


class TestWebSocketNotifications:
    """Test WebSocket notification endpoint"""
    
    def test_websocket_requires_token(self):
        """WebSocket /api/ws/notifications requires token query parameter"""
        import websocket
        
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        ws_url = f"{ws_url}/api/ws/notifications"
        
        try:
            ws = websocket.create_connection(ws_url, timeout=5)
            # If we get here without token, it should close with error
            ws.close()
            pytest.fail("WebSocket should reject connection without token")
        except Exception as e:
            # Expected - connection should be rejected
            print(f"✓ WebSocket rejects connection without token: {str(e)[:50]}")
    
    def test_websocket_rejects_invalid_token(self):
        """WebSocket /api/ws/notifications rejects invalid token"""
        import websocket
        
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        ws_url = f"{ws_url}/api/ws/notifications?token=invalid_token"
        
        try:
            ws = websocket.create_connection(ws_url, timeout=5)
            ws.close()
            pytest.fail("WebSocket should reject invalid token")
        except Exception as e:
            print(f"✓ WebSocket rejects invalid token: {str(e)[:50]}")
    
    def test_websocket_connects_with_valid_token(self):
        """WebSocket /api/ws/notifications connects with valid session token"""
        import websocket
        
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        ws_url = f"{ws_url}/api/ws/notifications?token={VIEWER_SESSION_TOKEN}"
        
        try:
            ws = websocket.create_connection(ws_url, timeout=10)
            
            # Should receive connected message with unread_count
            result = ws.recv()
            data = json.loads(result)
            
            assert data["type"] == "connected"
            assert "unread_count" in data
            print(f"✓ WebSocket connected, received: type={data['type']}, unread_count={data['unread_count']}")
            
            # Test ping/pong
            ws.send("ping")
            pong = ws.recv()
            assert pong == "pong"
            print("✓ WebSocket ping/pong working")
            
            ws.close()
            print("✓ WebSocket connection closed cleanly")
        except Exception as e:
            pytest.fail(f"WebSocket connection failed: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
