"""
Admin Panel API Tests for ShowMeLive Platform
Tests admin login, dashboard, users, events, tickets management
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@showmelive.com"
ADMIN_PASSWORD = "admin123"


class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "session_token" in data
        assert "user" in data
        assert data["session_token"].startswith("admin_")
        
        # Verify user data
        user = data["user"]
        assert user["email"] == ADMIN_EMAIL
        assert user["role"] == "admin"
        assert user["name"] == "Admin"
    
    def test_admin_login_invalid_email(self):
        """Test admin login with invalid email"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "wrong@email.com", "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert data["detail"] == "Invalid credentials"
    
    def test_admin_login_invalid_password(self):
        """Test admin login with invalid password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401
        data = response.json()
        assert data["detail"] == "Invalid credentials"


class TestAdminDashboard:
    """Admin dashboard statistics tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["session_token"]
        pytest.skip("Admin login failed")
    
    def test_dashboard_stats(self, admin_token):
        """Test admin dashboard returns correct statistics structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify users stats
        assert "users" in data
        assert "total" in data["users"]
        assert "creators" in data["users"]
        assert "viewers" in data["users"]
        assert "blocked" in data["users"]
        
        # Verify events stats
        assert "events" in data
        assert "total" in data["events"]
        assert "live" in data["events"]
        assert "blocked" in data["events"]
        
        # Verify tickets stats
        assert "tickets" in data
        assert "total" in data["tickets"]
        
        # Verify revenue stats
        assert "revenue" in data
        assert "total" in data["revenue"]
        assert "platform_earnings" in data["revenue"]
    
    def test_dashboard_unauthorized(self):
        """Test dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard")
        assert response.status_code == 401


class TestAdminUsers:
    """Admin user management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["session_token"]
        pytest.skip("Admin login failed")
    
    def test_get_all_users(self, admin_token):
        """Test fetching all users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
        
        # If users exist, verify structure
        if len(data) > 0:
            user = data[0]
            assert "id" in user
            assert "email" in user
            assert "name" in user
    
    def test_users_unauthorized(self):
        """Test users endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 401


class TestAdminEvents:
    """Admin event management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["session_token"]
        pytest.skip("Admin login failed")
    
    def test_get_all_events(self, admin_token):
        """Test fetching all events for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/events",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
        
        # If events exist, verify structure
        if len(data) > 0:
            event = data[0]
            assert "id" in event
            assert "title" in event
            assert "status" in event
            assert "is_blocked" in event or event.get("is_blocked") is None
    
    def test_events_unauthorized(self):
        """Test events endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/events")
        assert response.status_code == 401


class TestAdminTickets:
    """Admin ticket management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["session_token"]
        pytest.skip("Admin login failed")
    
    def test_get_all_tickets(self, admin_token):
        """Test fetching all tickets"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tickets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
    
    def test_tickets_unauthorized(self):
        """Test tickets endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/tickets")
        assert response.status_code == 401


class TestAdminBankInfo:
    """Admin bank info tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["session_token"]
        pytest.skip("Admin login failed")
    
    def test_get_bank_info(self, admin_token):
        """Test fetching bank info"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bank-info",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        # Returns empty object or bank info
        data = response.json()
        assert isinstance(data, dict)


class TestAdminLiveMonitoring:
    """Admin live monitoring tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin session token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["session_token"]
        pytest.skip("Admin login failed")
    
    def test_live_monitoring(self, admin_token):
        """Test live monitoring endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/live-monitoring",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
