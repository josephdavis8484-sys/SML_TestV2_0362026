"""
Test suite for Geo-fencing and Event Cancellation features
Tests:
- Geo-fencing fields in Event model
- POST /api/events/{event_id}/check-geo - returns access status based on country
- GET /api/events/{event_id}/geo-settings - returns geo settings (creator only)
- PUT /api/events/{event_id}/geo-settings - updates geo settings
- POST /api/events/{event_id}/cancel - cancels event and refunds all tickets
"""

import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGeoFencingAndCancelFeatures:
    """Test geo-fencing and event cancellation features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Admin credentials
        self.admin_email = "admin@showmelive.com"
        self.admin_password = "admin123"
        
        # Test data tracking
        self.created_users = []
        self.created_events = []
        self.created_tickets = []
        
        yield
        
        # Cleanup
        self._cleanup_test_data()
    
    def _cleanup_test_data(self):
        """Clean up test data after tests"""
        # Note: In production, we'd delete test data here
        pass
    
    def _create_test_user(self, role="creator"):
        """Create a test user and session"""
        import subprocess
        import json
        
        timestamp = int(datetime.now().timestamp() * 1000)
        user_id = f"test-geo-user-{timestamp}"
        session_token = f"test_geo_session_{timestamp}"
        email = f"test.geo.{timestamp}@example.com"
        
        mongo_script = f'''
        use('test_database');
        db.users.insertOne({{
            id: "{user_id}",
            email: "{email}",
            name: "Test Geo User",
            role: "{role}",
            picture: "https://via.placeholder.com/150",
            created_at: new Date().toISOString()
        }});
        db.user_sessions.insertOne({{
            user_id: "{user_id}",
            session_token: "{session_token}",
            expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
            created_at: new Date().toISOString()
        }});
        '''
        
        result = subprocess.run(
            ['mongosh', '--quiet', '--eval', mongo_script],
            capture_output=True,
            text=True
        )
        
        self.created_users.append(user_id)
        return user_id, session_token, email
    
    def _create_test_event(self, creator_id, session_token, geo_restricted=False, allowed_countries=None, blocked_countries=None):
        """Create a test event with geo settings"""
        import subprocess
        
        timestamp = int(datetime.now().timestamp() * 1000)
        event_id = f"test-geo-event-{timestamp}"
        
        allowed = allowed_countries or []
        blocked = blocked_countries or []
        
        mongo_script = f'''
        use('test_database');
        db.events.insertOne({{
            id: "{event_id}",
            creator_id: "{creator_id}",
            title: "Test Geo Event {timestamp}",
            category: "Music",
            image_url: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400",
            date: "2026-03-15",
            time: "8:00 PM",
            description: "Test event for geo-fencing",
            venue: "Test Venue",
            price: 25.0,
            streaming_package: "free",
            status: "upcoming",
            geo_restricted: {str(geo_restricted).lower()},
            allowed_countries: {allowed},
            blocked_countries: {blocked},
            total_revenue: 0.0,
            created_at: new Date().toISOString()
        }});
        '''
        
        result = subprocess.run(
            ['mongosh', '--quiet', '--eval', mongo_script],
            capture_output=True,
            text=True
        )
        
        self.created_events.append(event_id)
        return event_id
    
    def _create_test_ticket(self, event_id, user_id, amount=25.0):
        """Create a test ticket"""
        import subprocess
        
        timestamp = int(datetime.now().timestamp() * 1000)
        ticket_id = f"test-geo-ticket-{timestamp}"
        
        mongo_script = f'''
        use('test_database');
        db.tickets.insertOne({{
            id: "{ticket_id}",
            event_id: "{event_id}",
            user_id: "{user_id}",
            quantity: 1,
            amount_paid: {amount},
            refunded: false,
            purchase_date: new Date().toISOString()
        }});
        '''
        
        result = subprocess.run(
            ['mongosh', '--quiet', '--eval', mongo_script],
            capture_output=True,
            text=True
        )
        
        self.created_tickets.append(ticket_id)
        return ticket_id
    
    # ==================== GEO-FENCING TESTS ====================
    
    def test_events_have_geo_fields(self):
        """Test that events API returns geo-fencing fields"""
        response = self.session.get(f"{self.base_url}/api/events")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        events = response.json()
        if len(events) > 0:
            event = events[0]
            # Check geo fields exist
            assert "geo_restricted" in event, "Event should have geo_restricted field"
            assert "allowed_countries" in event, "Event should have allowed_countries field"
            assert "blocked_countries" in event, "Event should have blocked_countries field"
            print(f"✓ Event has geo fields: geo_restricted={event['geo_restricted']}")
    
    def test_check_geo_no_restriction(self):
        """Test geo check for event without restrictions"""
        # Create test user and event without geo restriction
        user_id, session_token, _ = self._create_test_user()
        event_id = self._create_test_event(user_id, session_token, geo_restricted=False)
        
        # Check geo access
        response = self.session.post(
            f"{self.base_url}/api/events/{event_id}/check-geo?country_code=US"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["allowed"] == True, "Should allow access when geo_restricted is False"
        assert "worldwide" in data["message"].lower(), "Message should mention worldwide access"
        print(f"✓ Geo check passed for unrestricted event: {data['message']}")
    
    def test_check_geo_allowed_country(self):
        """Test geo check for allowed country"""
        user_id, session_token, _ = self._create_test_user()
        event_id = self._create_test_event(
            user_id, session_token, 
            geo_restricted=True, 
            allowed_countries=["US", "CA", "GB"]
        )
        
        # Check allowed country
        response = self.session.post(
            f"{self.base_url}/api/events/{event_id}/check-geo?country_code=US"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["allowed"] == True, "US should be allowed"
        print(f"✓ Allowed country (US) access granted")
        
        # Check another allowed country
        response = self.session.post(
            f"{self.base_url}/api/events/{event_id}/check-geo?country_code=CA"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["allowed"] == True, "CA should be allowed"
        print(f"✓ Allowed country (CA) access granted")
    
    def test_check_geo_blocked_country(self):
        """Test geo check for blocked country"""
        user_id, session_token, _ = self._create_test_user()
        event_id = self._create_test_event(
            user_id, session_token, 
            geo_restricted=True, 
            blocked_countries=["RU", "CN"]
        )
        
        # Check blocked country
        response = self.session.post(
            f"{self.base_url}/api/events/{event_id}/check-geo?country_code=RU"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["allowed"] == False, "RU should be blocked"
        assert "not available" in data["message"].lower()
        print(f"✓ Blocked country (RU) access denied: {data['message']}")
    
    def test_check_geo_not_in_allowed_list(self):
        """Test geo check for country not in allowed list"""
        user_id, session_token, _ = self._create_test_user()
        event_id = self._create_test_event(
            user_id, session_token, 
            geo_restricted=True, 
            allowed_countries=["US", "CA"]
        )
        
        # Check country not in allowed list
        response = self.session.post(
            f"{self.base_url}/api/events/{event_id}/check-geo?country_code=DE"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["allowed"] == False, "DE should not be allowed when only US, CA are allowed"
        print(f"✓ Country not in allowed list denied: {data['message']}")
    
    def test_get_geo_settings_requires_auth(self):
        """Test that geo settings endpoint requires authentication"""
        user_id, session_token, _ = self._create_test_user()
        event_id = self._create_test_event(user_id, session_token)
        
        # Try without auth
        response = self.session.get(f"{self.base_url}/api/events/{event_id}/geo-settings")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET geo-settings requires authentication")
    
    def test_get_geo_settings_creator_only(self):
        """Test that only creator can get geo settings"""
        creator_id, creator_token, _ = self._create_test_user(role="creator")
        event_id = self._create_test_event(creator_id, creator_token)
        
        # Creator should be able to get settings
        response = self.session.get(
            f"{self.base_url}/api/events/{event_id}/geo-settings",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "geo_restricted" in data
        assert "allowed_countries" in data
        assert "blocked_countries" in data
        print(f"✓ Creator can get geo settings: {data}")
        
        # Another user should not be able to get settings
        other_id, other_token, _ = self._create_test_user(role="viewer")
        response = self.session.get(
            f"{self.base_url}/api/events/{event_id}/geo-settings",
            headers={"Authorization": f"Bearer {other_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Non-creator cannot get geo settings")
    
    def test_update_geo_settings(self):
        """Test updating geo settings"""
        creator_id, creator_token, _ = self._create_test_user(role="creator")
        event_id = self._create_test_event(creator_id, creator_token)
        
        # Update geo settings
        response = self.session.put(
            f"{self.base_url}/api/events/{event_id}/geo-settings",
            params={
                "geo_restricted": True,
                "allowed_countries": ["US", "CA"],
                "blocked_countries": []
            },
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["success"] == True
        print(f"✓ Geo settings updated successfully")
        
        # Verify the update
        response = self.session.get(
            f"{self.base_url}/api/events/{event_id}/geo-settings",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["geo_restricted"] == True
        assert "US" in data["allowed_countries"]
        assert "CA" in data["allowed_countries"]
        print(f"✓ Geo settings verified: {data}")
    
    # ==================== EVENT CANCELLATION TESTS ====================
    
    def test_cancel_event_requires_auth(self):
        """Test that cancel endpoint requires authentication"""
        user_id, session_token, _ = self._create_test_user()
        event_id = self._create_test_event(user_id, session_token)
        
        response = self.session.post(f"{self.base_url}/api/events/{event_id}/cancel")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Cancel event requires authentication")
    
    def test_cancel_event_creator_only(self):
        """Test that only creator can cancel event"""
        creator_id, creator_token, _ = self._create_test_user(role="creator")
        event_id = self._create_test_event(creator_id, creator_token)
        
        # Another user should not be able to cancel
        other_id, other_token, _ = self._create_test_user(role="creator")
        response = self.session.post(
            f"{self.base_url}/api/events/{event_id}/cancel",
            headers={"Authorization": f"Bearer {other_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Non-creator cannot cancel event")
    
    def test_cancel_event_success(self):
        """Test successful event cancellation"""
        creator_id, creator_token, _ = self._create_test_user(role="creator")
        event_id = self._create_test_event(creator_id, creator_token)
        
        # Cancel the event
        response = self.session.post(
            f"{self.base_url}/api/events/{event_id}/cancel?reason=Testing%20cancellation",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["success"] == True
        assert "cancelled" in data["message"].lower()
        print(f"✓ Event cancelled: {data['message']}")
        
        # Verify event status is cancelled
        response = self.session.get(f"{self.base_url}/api/events/{event_id}")
        assert response.status_code == 200
        event = response.json()
        assert event["status"] == "cancelled"
        assert event["cancellation_reason"] == "Testing cancellation"
        print(f"✓ Event status verified as cancelled")
    
    def test_cancel_event_with_tickets_refunds(self):
        """Test that cancelling event refunds all tickets"""
        creator_id, creator_token, _ = self._create_test_user(role="creator")
        event_id = self._create_test_event(creator_id, creator_token)
        
        # Create some tickets
        viewer1_id, _, _ = self._create_test_user(role="viewer")
        viewer2_id, _, _ = self._create_test_user(role="viewer")
        
        ticket1_id = self._create_test_ticket(event_id, viewer1_id, 25.0)
        ticket2_id = self._create_test_ticket(event_id, viewer2_id, 25.0)
        
        # Cancel the event
        response = self.session.post(
            f"{self.base_url}/api/events/{event_id}/cancel?reason=Event%20cancelled%20for%20testing",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["refunded_count"] == 2, f"Expected 2 refunds, got {data['refunded_count']}"
        assert data["total_refunded"] == 50.0, f"Expected $50 refunded, got {data['total_refunded']}"
        print(f"✓ Event cancelled with {data['refunded_count']} tickets refunded, total: ${data['total_refunded']}")
    
    def test_cancel_already_cancelled_event(self):
        """Test cancelling an already cancelled event"""
        creator_id, creator_token, _ = self._create_test_user(role="creator")
        event_id = self._create_test_event(creator_id, creator_token)
        
        # Cancel first time
        response = self.session.post(
            f"{self.base_url}/api/events/{event_id}/cancel",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 200
        
        # Try to cancel again
        response = self.session.post(
            f"{self.base_url}/api/events/{event_id}/cancel",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert "already cancelled" in data["message"].lower()
        print("✓ Cannot cancel already cancelled event")
    
    def test_cancel_event_not_found(self):
        """Test cancelling non-existent event"""
        creator_id, creator_token, _ = self._create_test_user(role="creator")
        
        response = self.session.post(
            f"{self.base_url}/api/events/non-existent-event-id/cancel",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 404
        print("✓ Cancel returns 404 for non-existent event")
    
    # ==================== ADMIN EVENTS TAB TESTS ====================
    
    def test_admin_events_shows_creator_info(self):
        """Test that admin events endpoint returns creator info"""
        # Login as admin
        response = self.session.post(
            f"{self.base_url}/api/admin/login",
            params={"email": self.admin_email, "password": self.admin_password}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        admin_token = response.json()["session_token"]
        
        # Get admin events
        response = self.session.get(
            f"{self.base_url}/api/admin/events",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        events = response.json()
        if len(events) > 0:
            event = events[0]
            # Check for creator info
            assert "creator" in event, "Event should have creator info"
            assert "ticket_count" in event, "Event should have ticket_count"
            assert "platform_fee" in event, "Event should have platform_fee"
            assert "creator_earnings" in event, "Event should have creator_earnings"
            print(f"✓ Admin events shows creator info and revenue breakdown")
            print(f"  Creator: {event.get('creator', {}).get('name', 'Unknown')}")
            print(f"  Tickets: {event.get('ticket_count', 0)}")
            print(f"  Platform Fee: ${event.get('platform_fee', 0):.2f}")
            print(f"  Creator Earnings: ${event.get('creator_earnings', 0):.2f}")


class TestTicketCalendarDownload:
    """Test calendar download functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        yield
    
    def test_calendar_endpoint_requires_auth(self):
        """Test that calendar endpoint requires authentication"""
        response = self.session.get(f"{self.base_url}/api/tickets/fake-ticket-id/calendar")
        assert response.status_code == 401
        print("✓ Calendar endpoint requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
