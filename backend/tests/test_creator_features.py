"""
Test Creator Features: Onboarding, Bank Linking, Payouts, Multi-image Upload
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://showlive-1.preview.emergentagent.com')

# Test credentials
CREATOR_SESSION_TOKEN = "test_session_creator_1771382148007"
ADMIN_EMAIL = "admin@showmelive.com"
ADMIN_PASSWORD = "admin123"


class TestPublicEndpoints:
    """Test public endpoints accessible without authentication"""
    
    def test_events_list(self):
        """Test GET /api/events - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Events list returned {len(data)} events")
    
    def test_event_detail(self):
        """Test GET /api/events/{id} - public endpoint"""
        # First get list of events
        events_response = requests.get(f"{BASE_URL}/api/events")
        events = events_response.json()
        
        if len(events) > 0:
            event_id = events[0]["id"]
            response = requests.get(f"{BASE_URL}/api/events/{event_id}")
            assert response.status_code == 200
            data = response.json()
            assert "id" in data
            assert "title" in data
            print(f"✓ Event detail returned: {data['title']}")


class TestCreatorOnboarding:
    """Test Creator Onboarding endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
    
    def test_onboarding_status(self, auth_headers):
        """Test GET /api/creator/onboarding-status"""
        response = requests.get(
            f"{BASE_URL}/api/creator/onboarding-status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "current_step" in data
        assert "total_steps" in data
        assert "steps" in data
        assert "is_complete" in data
        
        # Verify steps structure
        steps = data["steps"]
        assert "profile_complete" in steps
        assert "bank_linked" in steps
        assert "first_event_created" in steps
        
        print(f"✓ Onboarding status: {data['current_step']}/{data['total_steps']} steps completed")
    
    def test_complete_onboarding(self, auth_headers):
        """Test POST /api/creator/complete-onboarding"""
        response = requests.post(
            f"{BASE_URL}/api/creator/complete-onboarding",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Complete onboarding endpoint works")


class TestCreatorBankLinking:
    """Test Creator Bank Account Linking endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
    
    def test_bank_status_initial(self, auth_headers):
        """Test GET /api/creator/bank-status - initial state"""
        response = requests.get(
            f"{BASE_URL}/api/creator/bank-status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "bank_linked" in data
        print(f"✓ Bank status: linked={data['bank_linked']}")
    
    def test_link_bank_account(self, auth_headers):
        """Test POST /api/creator/link-bank - mock Plaid implementation"""
        bank_info = {
            "account_mask": "1234",
            "account_name": "Test Checking",
            "institution_name": "Test Bank"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/creator/link-bank",
            headers=auth_headers,
            json=bank_info
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "bank_account" in data
        assert data["bank_account"]["mask"] == "1234"
        print("✓ Bank account linked successfully (MOCK implementation)")
    
    def test_bank_status_after_linking(self, auth_headers):
        """Test GET /api/creator/bank-status - after linking"""
        response = requests.get(
            f"{BASE_URL}/api/creator/bank-status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["bank_linked"] == True
        assert data["bank_account"]["mask"] == "1234"
        print("✓ Bank status shows linked account")


class TestCreatorPayouts:
    """Test Creator Payout/Withdrawal endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
    
    def test_earnings(self, auth_headers):
        """Test GET /api/creator/earnings"""
        response = requests.get(
            f"{BASE_URL}/api/creator/earnings",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "total_revenue" in data
        assert "platform_fee" in data
        assert "creator_earnings" in data
        assert "pending_payout" in data
        
        print(f"✓ Creator earnings: ${data['creator_earnings']:.2f}")
    
    def test_payout_history(self, auth_headers):
        """Test GET /api/creator/payouts"""
        response = requests.get(
            f"{BASE_URL}/api/creator/payouts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Payout history: {len(data)} payouts")
    
    def test_withdraw_insufficient_balance(self, auth_headers):
        """Test POST /api/creator/withdraw - with insufficient balance"""
        response = requests.post(
            f"{BASE_URL}/api/creator/withdraw",
            headers=auth_headers,
            json={"amount": 1000.00}  # Large amount that likely exceeds balance
        )
        # Should fail with 400 for insufficient balance
        assert response.status_code == 400
        print("✓ Withdrawal correctly rejected for insufficient balance")
    
    def test_withdraw_minimum_amount(self, auth_headers):
        """Test POST /api/creator/withdraw - below minimum"""
        response = requests.post(
            f"{BASE_URL}/api/creator/withdraw",
            headers=auth_headers,
            json={"amount": 5.00}  # Below $10 minimum
        )
        assert response.status_code == 400
        data = response.json()
        assert "minimum" in data.get("detail", "").lower() or "10" in data.get("detail", "")
        print("✓ Withdrawal correctly rejected for below minimum amount")


class TestMultiImageUpload:
    """Test Multi-image Upload endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
    
    def test_upload_gallery_endpoint_exists(self, auth_headers):
        """Test POST /api/events/upload-gallery endpoint exists"""
        # Test with empty files - should return 422 (validation error) not 404
        response = requests.post(
            f"{BASE_URL}/api/events/upload-gallery",
            headers=auth_headers
        )
        # 422 means endpoint exists but validation failed (no files)
        # 404 would mean endpoint doesn't exist
        assert response.status_code in [422, 400]
        print("✓ Gallery upload endpoint exists")


class TestAdminLogin:
    """Test Admin Login functionality"""
    
    def test_admin_login_success(self):
        """Test POST /api/admin/login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "session_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print("✓ Admin login successful")
        return data["session_token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test POST /api/admin/login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "wrong@email.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        print("✓ Admin login correctly rejected invalid credentials")
    
    def test_admin_dashboard(self):
        """Test GET /api/admin/dashboard"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        token = login_response.json()["session_token"]
        
        # Access dashboard
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard structure
        assert "users" in data
        assert "events" in data
        assert "tickets" in data
        assert "revenue" in data
        
        print(f"✓ Admin dashboard: {data['users']['total']} users, {data['events']['total']} events")


class TestCreatorEvents:
    """Test Creator Event Management"""
    
    @pytest.fixture
    def auth_headers(self):
        return {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
    
    def test_my_events(self, auth_headers):
        """Test GET /api/events/creator/my-events"""
        response = requests.get(
            f"{BASE_URL}/api/events/creator/my-events",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Creator has {len(data)} events")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
