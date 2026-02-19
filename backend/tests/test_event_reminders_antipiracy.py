"""
Test suite for Event Reminders and Anti-Piracy features
- Background scheduler for event reminders (1 hour before event)
- Event go-live endpoint with ticket holder notifications
- Promo codes for Pro Mode
- Stripe Connect payout settings
"""
import pytest
import requests
import os
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✓ API health check passed")
    
    def test_events_endpoint(self):
        """Test events endpoint"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Events endpoint returned {len(data)} events")


class TestEventGoLive:
    """Test event go-live functionality"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "admin@showmelive.online", "password": "admin"}
        )
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def creator_session(self, admin_session):
        """Create a test creator user and get session"""
        import uuid
        import pymongo
        
        # Connect to MongoDB directly to create test user
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = pymongo.MongoClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'test_database')]
        
        user_id = f"test-creator-{uuid.uuid4()}"
        session_token = f"test_session_{uuid.uuid4()}"
        
        # Create test creator user
        db.users.insert_one({
            "id": user_id,
            "email": f"test.creator.{uuid.uuid4()}@example.com",
            "name": "Test Creator",
            "role": "creator",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Create session
        db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        yield {"token": session_token, "user_id": user_id}
        
        # Cleanup
        db.users.delete_one({"id": user_id})
        db.user_sessions.delete_one({"session_token": session_token})
        client.close()
    
    def test_get_events_list(self):
        """Test getting events list"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        print("✓ Events list retrieved successfully")
    
    def test_event_go_live_requires_auth(self):
        """Test that go-live endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/events/fake-id/go-live")
        assert response.status_code == 401
        print("✓ Go-live endpoint requires authentication")
    
    def test_event_go_live_with_creator(self, creator_session):
        """Test event go-live with creator session"""
        import uuid
        import pymongo
        
        # Create a test event
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = pymongo.MongoClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'test_database')]
        
        event_id = f"test-event-{uuid.uuid4()}"
        db.events.insert_one({
            "id": event_id,
            "creator_id": creator_session["user_id"],
            "title": "Test Live Event",
            "category": "Music",
            "date": "2026-02-20",
            "time": "8:00 PM",
            "description": "Test event for go-live",
            "venue": "Test Venue",
            "price": 10.0,
            "status": "upcoming",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        try:
            # Test go-live
            headers = {"Authorization": f"Bearer {creator_session['token']}"}
            response = requests.post(
                f"{BASE_URL}/api/events/{event_id}/go-live",
                headers=headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data.get("status") == "live" or "success" in str(data).lower()
            print("✓ Event go-live successful")
            
            # Verify event status changed
            event = db.events.find_one({"id": event_id})
            assert event["status"] == "live"
            print("✓ Event status updated to 'live'")
            
        finally:
            # Cleanup
            db.events.delete_one({"id": event_id})
            client.close()


class TestPromoCodesFunctionality:
    """Test promo codes for Pro Mode"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "admin@showmelive.online", "password": "admin"}
        )
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Admin login failed")
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "admin@showmelive.online", "password": "admin"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        print("✓ Admin login successful")
    
    def test_get_promo_codes_requires_admin(self):
        """Test that promo codes endpoint requires admin"""
        response = requests.get(f"{BASE_URL}/api/admin/promo-codes")
        assert response.status_code == 401
        print("✓ Promo codes endpoint requires admin auth")
    
    def test_get_promo_codes_with_admin(self, admin_session):
        """Test getting promo codes with admin session"""
        headers = {"Authorization": f"Bearer {admin_session}"}
        response = requests.get(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} promo codes")
    
    def test_create_promo_code(self, admin_session):
        """Test creating a promo code"""
        headers = {"Authorization": f"Bearer {admin_session}"}
        promo_data = {
            "code": "TEST50OFF",
            "description": "Test 50% off promo",
            "discount_type": "percentage",
            "discount_value": 50,
            "applies_to": "pro_mode",
            "max_uses": 100
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=headers,
            json=promo_data
        )
        
        # May fail if code already exists
        if response.status_code == 400 and "exists" in response.text.lower():
            print("✓ Promo code already exists (expected)")
        else:
            assert response.status_code == 200
            print("✓ Promo code created successfully")


class TestStripeConnectPayouts:
    """Test Stripe Connect payout settings"""
    
    @pytest.fixture(scope="class")
    def creator_session(self):
        """Create a test creator user and get session"""
        import uuid
        import pymongo
        
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = pymongo.MongoClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'test_database')]
        
        user_id = f"test-creator-stripe-{uuid.uuid4()}"
        session_token = f"test_session_{uuid.uuid4()}"
        
        db.users.insert_one({
            "id": user_id,
            "email": f"test.stripe.{uuid.uuid4()}@example.com",
            "name": "Test Stripe Creator",
            "role": "creator",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        yield {"token": session_token, "user_id": user_id}
        
        db.users.delete_one({"id": user_id})
        db.user_sessions.delete_one({"session_token": session_token})
        client.close()
    
    def test_stripe_connect_status_requires_auth(self):
        """Test Stripe Connect status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/creator/stripe-connect/status")
        assert response.status_code == 401
        print("✓ Stripe Connect status requires auth")
    
    def test_stripe_connect_status_with_creator(self, creator_session):
        """Test getting Stripe Connect status"""
        headers = {"Authorization": f"Bearer {creator_session['token']}"}
        response = requests.get(
            f"{BASE_URL}/api/creator/stripe-connect/status",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data or "stripe_account_id" in data or "status" in str(data).lower()
        print("✓ Stripe Connect status retrieved")
    
    def test_stripe_connect_onboard_requires_auth(self):
        """Test Stripe Connect onboard requires authentication"""
        response = requests.post(f"{BASE_URL}/api/creator/stripe-connect/onboard")
        assert response.status_code == 401
        print("✓ Stripe Connect onboard requires auth")


class TestNotificationsEndpoints:
    """Test notification endpoints"""
    
    @pytest.fixture(scope="class")
    def user_session(self):
        """Create a test user and get session"""
        import uuid
        import pymongo
        
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = pymongo.MongoClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'test_database')]
        
        user_id = f"test-user-notif-{uuid.uuid4()}"
        session_token = f"test_session_{uuid.uuid4()}"
        
        db.users.insert_one({
            "id": user_id,
            "email": f"test.notif.{uuid.uuid4()}@example.com",
            "name": "Test Notification User",
            "role": "viewer",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        yield {"token": session_token, "user_id": user_id}
        
        db.users.delete_one({"id": user_id})
        db.user_sessions.delete_one({"session_token": session_token})
        db.notifications.delete_many({"user_id": user_id})
        client.close()
    
    def test_get_notifications_requires_auth(self):
        """Test notifications endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401
        print("✓ Notifications endpoint requires auth")
    
    def test_get_notifications_with_user(self, user_session):
        """Test getting notifications with user session"""
        headers = {"Authorization": f"Bearer {user_session['token']}"}
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} notifications")


class TestRoleSelection:
    """Test role selection functionality"""
    
    @pytest.fixture(scope="class")
    def user_session(self):
        """Create a test user without role and get session"""
        import uuid
        import pymongo
        
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = pymongo.MongoClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'test_database')]
        
        user_id = f"test-user-role-{uuid.uuid4()}"
        session_token = f"test_session_{uuid.uuid4()}"
        
        db.users.insert_one({
            "id": user_id,
            "email": f"test.role.{uuid.uuid4()}@example.com",
            "name": "Test Role User",
            "role": None,  # No role set
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        yield {"token": session_token, "user_id": user_id}
        
        db.users.delete_one({"id": user_id})
        db.user_sessions.delete_one({"session_token": session_token})
        client.close()
    
    def test_set_role_requires_auth(self):
        """Test role selection requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/auth/role",
            json={"role": "viewer"}
        )
        assert response.status_code == 401
        print("✓ Role selection requires auth")
    
    def test_set_viewer_role(self, user_session):
        """Test setting viewer role"""
        headers = {"Authorization": f"Bearer {user_session['token']}"}
        response = requests.post(
            f"{BASE_URL}/api/auth/role",
            headers=headers,
            json={"role": "viewer"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "viewer"
        print("✓ Viewer role set successfully")
    
    def test_set_creator_role(self, user_session):
        """Test setting creator role"""
        headers = {"Authorization": f"Bearer {user_session['token']}"}
        response = requests.post(
            f"{BASE_URL}/api/auth/role",
            headers=headers,
            json={"role": "creator"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "creator"
        print("✓ Creator role set successfully")
    
    def test_invalid_role_rejected(self, user_session):
        """Test invalid role is rejected"""
        headers = {"Authorization": f"Bearer {user_session['token']}"}
        response = requests.post(
            f"{BASE_URL}/api/auth/role",
            headers=headers,
            json={"role": "invalid_role"}
        )
        assert response.status_code == 400
        print("✓ Invalid role rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
