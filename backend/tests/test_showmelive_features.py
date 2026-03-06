"""
ShowMeLive Feature Tests - Creator Analytics, Control Panel, Dashboard
Tests for new features: Analytics Dashboard, WebRTC Control Panel UI
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://creator-stage-6.preview.emergentagent.com').rstrip('/')

# Test session token created in MongoDB
CREATOR_SESSION_TOKEN = "test_session_creator_1771383294679"
CREATOR_USER_ID = "test-creator-1771383294679"
TEST_EVENT_ID = "test-event-1771383294696"


class TestPublicEndpoints:
    """Test public endpoints accessible without authentication"""
    
    def test_homepage_events_list(self):
        """Test that public events list is accessible"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Public events list returned {len(data)} events")
    
    def test_single_event_details(self):
        """Test getting single event details"""
        # First get list of events
        response = requests.get(f"{BASE_URL}/api/events")
        events = response.json()
        
        if len(events) > 0:
            event_id = events[0]['id']
            response = requests.get(f"{BASE_URL}/api/events/{event_id}")
            assert response.status_code == 200
            data = response.json()
            assert 'title' in data
            assert 'price' in data
            print(f"✅ Event details retrieved: {data['title']}")
        else:
            pytest.skip("No events available to test")


class TestCreatorAnalytics:
    """Test Creator Analytics Dashboard API"""
    
    @pytest.fixture
    def auth_headers(self):
        return {
            "Authorization": f"Bearer {CREATOR_SESSION_TOKEN}",
            "Content-Type": "application/json"
        }
    
    def test_analytics_endpoint_returns_data(self, auth_headers):
        """Test that analytics endpoint returns proper data structure"""
        response = requests.get(f"{BASE_URL}/api/creator/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary section
        assert 'summary' in data
        summary = data['summary']
        assert 'total_revenue' in summary
        assert 'total_tickets_sold' in summary
        assert 'total_events' in summary
        assert 'avg_ticket_price' in summary
        assert 'creator_share' in summary
        print(f"✅ Analytics summary: Revenue=${summary['total_revenue']}, Tickets={summary['total_tickets_sold']}")
    
    def test_analytics_revenue_trend(self, auth_headers):
        """Test that revenue trend data is returned"""
        response = requests.get(f"{BASE_URL}/api/creator/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert 'revenue_trend' in data
        revenue_trend = data['revenue_trend']
        assert isinstance(revenue_trend, list)
        
        if len(revenue_trend) > 0:
            # Verify trend item structure
            trend_item = revenue_trend[0]
            assert 'month' in trend_item
            assert 'revenue' in trend_item
            assert 'tickets' in trend_item
            print(f"✅ Revenue trend has {len(revenue_trend)} months of data")
    
    def test_analytics_category_breakdown(self, auth_headers):
        """Test that category breakdown is returned"""
        response = requests.get(f"{BASE_URL}/api/creator/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert 'category_breakdown' in data
        categories = data['category_breakdown']
        assert isinstance(categories, list)
        
        if len(categories) > 0:
            cat = categories[0]
            assert 'category' in cat
            assert 'revenue' in cat
            assert 'tickets' in cat
            print(f"✅ Category breakdown has {len(categories)} categories")
    
    def test_analytics_top_events(self, auth_headers):
        """Test that top events table data is returned"""
        response = requests.get(f"{BASE_URL}/api/creator/analytics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert 'top_events' in data
        top_events = data['top_events']
        assert isinstance(top_events, list)
        
        if len(top_events) > 0:
            event = top_events[0]
            assert 'event_id' in event
            assert 'title' in event
            assert 'date' in event
            assert 'tickets_sold' in event
            assert 'revenue' in event
            assert 'status' in event
            print(f"✅ Top events: {len(top_events)} events, top is '{event['title']}'")


class TestCreatorDashboard:
    """Test Creator Dashboard API endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        return {
            "Authorization": f"Bearer {CREATOR_SESSION_TOKEN}",
            "Content-Type": "application/json"
        }
    
    def test_creator_earnings(self, auth_headers):
        """Test creator earnings endpoint"""
        response = requests.get(f"{BASE_URL}/api/creator/earnings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert 'total_revenue' in data
        assert 'creator_earnings' in data
        assert 'pending_payout' in data
        print(f"✅ Creator earnings: Total=${data['total_revenue']}, Earnings=${data['creator_earnings']}")
    
    def test_creator_my_events(self, auth_headers):
        """Test getting creator's own events"""
        response = requests.get(f"{BASE_URL}/api/events/creator/my-events", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✅ Creator has {len(data)} events")
    
    def test_onboarding_status(self, auth_headers):
        """Test onboarding status endpoint"""
        response = requests.get(f"{BASE_URL}/api/creator/onboarding-status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert 'current_step' in data
        assert 'total_steps' in data
        assert 'steps' in data
        print(f"✅ Onboarding status: {data['current_step']}/{data['total_steps']} steps")


class TestControlPanelAPIs:
    """Test Control Panel related APIs"""
    
    @pytest.fixture
    def auth_headers(self):
        return {
            "Authorization": f"Bearer {CREATOR_SESSION_TOKEN}",
            "Content-Type": "application/json"
        }
    
    def test_get_event_for_control_panel(self, auth_headers):
        """Test getting event details for control panel"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert 'streaming_package' in data
        assert data['streaming_package'] in ['free', 'premium']
        print(f"✅ Event streaming package: {data['streaming_package']}")
    
    def test_get_streaming_devices(self, auth_headers):
        """Test getting streaming devices for an event"""
        response = requests.get(f"{BASE_URL}/api/streaming/devices/{TEST_EVENT_ID}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✅ Event has {len(data)} streaming devices")


class TestAdminPanel:
    """Test Admin Panel endpoints"""
    
    def test_admin_login(self):
        """Test admin login with credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "admin@showmelive.com", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'session_token' in data
        assert 'user' in data
        print(f"✅ Admin login successful, token received")
        return data['session_token']
    
    def test_admin_dashboard(self):
        """Test admin dashboard statistics"""
        # First login
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "admin@showmelive.com", "password": "admin123"}
        )
        admin_token = login_response.json()['session_token']
        
        # Get dashboard
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'users' in data
        assert 'events' in data
        assert 'tickets' in data
        assert 'revenue' in data
        print(f"✅ Admin dashboard: {data['users']['total']} users, {data['events']['total']} events")


class TestBankAndPayouts:
    """Test Bank linking and Payout APIs (MOCKED)"""
    
    @pytest.fixture
    def auth_headers(self):
        return {
            "Authorization": f"Bearer {CREATOR_SESSION_TOKEN}",
            "Content-Type": "application/json"
        }
    
    def test_bank_status(self, auth_headers):
        """Test getting bank account status"""
        response = requests.get(f"{BASE_URL}/api/creator/bank-status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert 'bank_linked' in data
        print(f"✅ Bank linked status: {data['bank_linked']}")
    
    def test_payout_history(self, auth_headers):
        """Test getting payout history"""
        response = requests.get(f"{BASE_URL}/api/creator/payouts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✅ Payout history: {len(data)} payouts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
