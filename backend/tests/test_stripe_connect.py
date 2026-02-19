"""
Test Stripe Connect endpoints for creator payouts
Tests the migration from Plaid to Stripe Connect
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://creator-stage-1.preview.emergentagent.com').rstrip('/')

# Test session token (created for testing)
TEST_SESSION_TOKEN = None
TEST_USER_ID = None


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def creator_session(api_client):
    """Create a test creator user and session"""
    import subprocess
    import json
    
    # Create test user via mongosh
    timestamp = int(datetime.now().timestamp() * 1000)
    user_id = f"test-creator-stripe-{timestamp}"
    session_token = f"test_session_stripe_{timestamp}"
    
    mongo_cmd = f'''
    use('test_database');
    db.users.insertOne({{
      id: "{user_id}",
      email: "test.creator.stripe.{timestamp}@example.com",
      name: "Test Creator Stripe",
      picture: "https://via.placeholder.com/150",
      role: "creator",
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
        ['mongosh', '--quiet', '--eval', mongo_cmd],
        capture_output=True,
        text=True
    )
    
    return {
        "user_id": user_id,
        "session_token": session_token
    }


@pytest.fixture(scope="module")
def viewer_session(api_client):
    """Create a test viewer user and session"""
    import subprocess
    
    timestamp = int(datetime.now().timestamp() * 1000)
    user_id = f"test-viewer-stripe-{timestamp}"
    session_token = f"test_session_viewer_{timestamp}"
    
    mongo_cmd = f'''
    use('test_database');
    db.users.insertOne({{
      id: "{user_id}",
      email: "test.viewer.stripe.{timestamp}@example.com",
      name: "Test Viewer",
      picture: "https://via.placeholder.com/150",
      role: "viewer",
      created_at: new Date().toISOString()
    }});
    db.user_sessions.insertOne({{
      user_id: "{user_id}",
      session_token: "{session_token}",
      expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      created_at: new Date().toISOString()
    }});
    '''
    
    subprocess.run(
        ['mongosh', '--quiet', '--eval', mongo_cmd],
        capture_output=True,
        text=True
    )
    
    return {
        "user_id": user_id,
        "session_token": session_token
    }


class TestStripeConnectStatus:
    """Test GET /api/stripe/connect/status endpoint"""
    
    def test_status_returns_connected_false_for_new_user(self, api_client, creator_session):
        """New creator should have connected=false"""
        response = api_client.get(
            f"{BASE_URL}/api/stripe/connect/status",
            headers={"Authorization": f"Bearer {creator_session['session_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "connected" in data
        assert "account_id" in data
        assert "payouts_enabled" in data
        assert "details_submitted" in data
        
        # New user should not be connected
        assert data["connected"] == False
        assert data["account_id"] is None
        assert data["payouts_enabled"] == False
        assert data["details_submitted"] == False
    
    def test_status_requires_authentication(self, api_client):
        """Status endpoint should require authentication"""
        response = api_client.get(f"{BASE_URL}/api/stripe/connect/status")
        assert response.status_code == 401
    
    def test_status_requires_creator_role(self, api_client, viewer_session):
        """Status endpoint should only work for creators"""
        response = api_client.get(
            f"{BASE_URL}/api/stripe/connect/status",
            headers={"Authorization": f"Bearer {viewer_session['session_token']}"}
        )
        assert response.status_code == 403
        assert "Only creators" in response.json()["detail"]


class TestStripeConnectCreateAccount:
    """Test POST /api/stripe/connect/create-account endpoint"""
    
    def test_create_account_requires_authentication(self, api_client):
        """Create account endpoint should require authentication"""
        response = api_client.post(f"{BASE_URL}/api/stripe/connect/create-account")
        assert response.status_code == 401
    
    def test_create_account_requires_creator_role(self, api_client, viewer_session):
        """Create account endpoint should only work for creators"""
        response = api_client.post(
            f"{BASE_URL}/api/stripe/connect/create-account",
            headers={"Authorization": f"Bearer {viewer_session['session_token']}"}
        )
        assert response.status_code == 403
        assert "Only creators" in response.json()["detail"]
    
    def test_create_account_returns_stripe_error_with_invalid_key(self, api_client, creator_session):
        """Create account should return Stripe error when API key is invalid"""
        response = api_client.post(
            f"{BASE_URL}/api/stripe/connect/create-account",
            headers={"Authorization": f"Bearer {creator_session['session_token']}"}
        )
        
        # Should return 400 with Stripe error (invalid API key)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        # The error should mention invalid API key
        assert "Invalid API Key" in data["detail"] or "api_key" in data["detail"].lower()


class TestStripeConnectOnboardingLink:
    """Test POST /api/stripe/connect/onboarding-link endpoint"""
    
    def test_onboarding_link_requires_authentication(self, api_client):
        """Onboarding link endpoint should require authentication"""
        response = api_client.post(
            f"{BASE_URL}/api/stripe/connect/onboarding-link",
            params={"origin_url": "https://example.com"}
        )
        assert response.status_code == 401
    
    def test_onboarding_link_requires_creator_role(self, api_client, viewer_session):
        """Onboarding link endpoint should only work for creators"""
        response = api_client.post(
            f"{BASE_URL}/api/stripe/connect/onboarding-link",
            headers={"Authorization": f"Bearer {viewer_session['session_token']}"},
            params={"origin_url": "https://example.com"}
        )
        assert response.status_code == 403
        assert "Only creators" in response.json()["detail"]
    
    def test_onboarding_link_returns_stripe_error_with_invalid_key(self, api_client, creator_session):
        """Onboarding link should return Stripe error when API key is invalid"""
        response = api_client.post(
            f"{BASE_URL}/api/stripe/connect/onboarding-link",
            headers={"Authorization": f"Bearer {creator_session['session_token']}"},
            params={"origin_url": "https://creator-stage-1.preview.emergentagent.com"}
        )
        
        # Should return 400 with Stripe error (invalid API key)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data


class TestStripeConnectBalance:
    """Test GET /api/stripe/connect/balance endpoint"""
    
    def test_balance_returns_correct_structure(self, api_client, creator_session):
        """Balance endpoint should return correct structure"""
        response = api_client.get(
            f"{BASE_URL}/api/stripe/connect/balance",
            headers={"Authorization": f"Bearer {creator_session['session_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "total_revenue" in data
        assert "platform_fee" in data
        assert "available_balance" in data
        assert "pending_payouts" in data
        assert "withdrawable" in data
        
        # New user should have zero balance
        assert data["total_revenue"] == 0
        assert data["available_balance"] == 0.0
        assert data["withdrawable"] == 0.0
    
    def test_balance_requires_authentication(self, api_client):
        """Balance endpoint should require authentication"""
        response = api_client.get(f"{BASE_URL}/api/stripe/connect/balance")
        assert response.status_code == 401
    
    def test_balance_requires_creator_role(self, api_client, viewer_session):
        """Balance endpoint should only work for creators"""
        response = api_client.get(
            f"{BASE_URL}/api/stripe/connect/balance",
            headers={"Authorization": f"Bearer {viewer_session['session_token']}"}
        )
        assert response.status_code == 403


class TestCreatorEarnings:
    """Test GET /api/creator/earnings endpoint"""
    
    def test_earnings_returns_correct_structure(self, api_client, creator_session):
        """Earnings endpoint should return correct structure"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/earnings",
            headers={"Authorization": f"Bearer {creator_session['session_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "total_revenue" in data
        assert "platform_fee" in data
        assert "creator_earnings" in data
        assert "pending_payout" in data
        assert "events" in data
        
        # New user should have zero earnings
        assert data["total_revenue"] == 0
        assert data["creator_earnings"] == 0.0
        assert isinstance(data["events"], list)
    
    def test_earnings_requires_authentication(self, api_client):
        """Earnings endpoint should require authentication"""
        response = api_client.get(f"{BASE_URL}/api/creator/earnings")
        assert response.status_code == 401
    
    def test_earnings_requires_creator_role(self, api_client, viewer_session):
        """Earnings endpoint should only work for creators"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/earnings",
            headers={"Authorization": f"Bearer {viewer_session['session_token']}"}
        )
        assert response.status_code == 403


class TestCreatorPayouts:
    """Test GET /api/creator/payouts endpoint"""
    
    def test_payouts_returns_empty_list_for_new_user(self, api_client, creator_session):
        """Payouts endpoint should return empty list for new user"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/payouts",
            headers={"Authorization": f"Bearer {creator_session['session_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # New user should have no payouts
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_payouts_requires_authentication(self, api_client):
        """Payouts endpoint should require authentication"""
        response = api_client.get(f"{BASE_URL}/api/creator/payouts")
        assert response.status_code == 401
    
    def test_payouts_requires_creator_role(self, api_client, viewer_session):
        """Payouts endpoint should only work for creators"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/payouts",
            headers={"Authorization": f"Bearer {viewer_session['session_token']}"}
        )
        assert response.status_code == 403


class TestSelectRoleFlow:
    """Test role selection flow"""
    
    def test_events_endpoint_works_without_auth(self, api_client):
        """Events endpoint should work without authentication"""
        response = api_client.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_auth_me_returns_401_without_session(self, api_client):
        """Auth me endpoint should return 401 without session"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup(request, api_client):
    """Cleanup test data after all tests"""
    yield
    # Cleanup is handled by test database reset
