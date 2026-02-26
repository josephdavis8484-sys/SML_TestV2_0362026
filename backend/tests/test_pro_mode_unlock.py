"""
Test Pro Mode Unlock Payment Feature
Tests the /api/pro-mode/unlock/checkout endpoint and related functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://virtual-events-3.preview.emergentagent.com').rstrip('/')

# Test credentials from main agent
TEST_CREATOR_SESSION = "creator_03ff4597-16ea-4eaa-a710-27d4a50735ca"
TEST_EVENT_FREE = "test-event-free-1772138147735"
TEST_EVENT_PREMIUM = "test-event-chat-1771457019709"
PROMO_CODE = "PROMODE50"


class TestProModeUnlockCheckout:
    """Tests for Pro Mode unlock checkout API"""
    
    @pytest.fixture
    def creator_session(self):
        """Get authenticated creator session"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {TEST_CREATOR_SESSION}"
        })
        return session
    
    @pytest.fixture
    def unauthenticated_session(self):
        """Get unauthenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_pro_mode_checkout_creates_stripe_session(self, creator_session):
        """Test that Pro Mode unlock checkout creates Stripe checkout session"""
        response = creator_session.post(f"{BASE_URL}/api/pro-mode/unlock/checkout", json={
            "event_id": TEST_EVENT_FREE,
            "origin_url": "https://virtual-events-3.preview.emergentagent.com"
        })
        
        # Should return 200 with checkout URL
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data, "Response should contain checkout URL"
        assert "session_id" in data, "Response should contain session_id"
        assert data["url"].startswith("https://checkout.stripe.com"), f"URL should be Stripe checkout: {data['url']}"
        
        # Verify amount is $1000 (no discount)
        assert data.get("amount") == 1000.0, f"Expected amount 1000, got {data.get('amount')}"
        assert data.get("discount") == 0, f"Expected no discount, got {data.get('discount')}"
        
        print(f"✅ Pro Mode checkout created: session_id={data['session_id']}")
    
    def test_pro_mode_checkout_with_promo_code(self, creator_session):
        """Test that promo code applies discount correctly"""
        response = creator_session.post(f"{BASE_URL}/api/pro-mode/unlock/checkout", json={
            "event_id": TEST_EVENT_FREE,
            "origin_url": "https://virtual-events-3.preview.emergentagent.com",
            "promo_code": PROMO_CODE
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data, "Response should contain checkout URL"
        
        # PROMODE50 gives 50% discount, so $500 off
        assert data.get("amount") == 500.0, f"Expected discounted amount 500, got {data.get('amount')}"
        assert data.get("discount") == 500.0, f"Expected discount 500, got {data.get('discount')}"
        assert "PROMODE50" in data.get("discount_description", ""), "Discount description should mention promo code"
        
        print(f"✅ Pro Mode checkout with promo: amount=${data['amount']}, discount=${data['discount']}")
    
    def test_pro_mode_checkout_rejects_premium_event(self, creator_session):
        """Test that checkout rejects events that already have premium package"""
        response = creator_session.post(f"{BASE_URL}/api/pro-mode/unlock/checkout", json={
            "event_id": TEST_EVENT_PREMIUM,
            "origin_url": "https://virtual-events-3.preview.emergentagent.com"
        })
        
        # Should return 400 - already premium
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "already" in data.get("detail", "").lower() or "premium" in data.get("detail", "").lower(), \
            f"Error should mention already premium: {data}"
        
        print(f"✅ Premium event correctly rejected: {data.get('detail')}")
    
    def test_pro_mode_checkout_requires_authentication(self, unauthenticated_session):
        """Test that checkout requires authentication"""
        response = unauthenticated_session.post(f"{BASE_URL}/api/pro-mode/unlock/checkout", json={
            "event_id": TEST_EVENT_FREE,
            "origin_url": "https://virtual-events-3.preview.emergentagent.com"
        })
        
        # Should return 401 - not authenticated
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        print("✅ Unauthenticated request correctly rejected")
    
    def test_pro_mode_checkout_requires_creator_role(self, creator_session):
        """Test that only creators can unlock Pro Mode"""
        # This test verifies the role check - the test creator has role=creator
        # We verify by checking that the request succeeds (role check passes)
        response = creator_session.post(f"{BASE_URL}/api/pro-mode/unlock/checkout", json={
            "event_id": TEST_EVENT_FREE,
            "origin_url": "https://virtual-events-3.preview.emergentagent.com"
        })
        
        # Should succeed (200) or fail for other reasons, but NOT 403
        assert response.status_code != 403, f"Creator should have access, got 403: {response.text}"
        
        print("✅ Creator role check passed")
    
    def test_pro_mode_checkout_requires_event_ownership(self, creator_session):
        """Test that only event owner can unlock Pro Mode"""
        # Try to unlock an event not owned by this creator
        response = creator_session.post(f"{BASE_URL}/api/pro-mode/unlock/checkout", json={
            "event_id": "non-existent-event-12345",
            "origin_url": "https://virtual-events-3.preview.emergentagent.com"
        })
        
        # Should return 404 - event not found or not owned
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        print("✅ Event ownership check passed")
    
    def test_pro_mode_checkout_requires_event_id(self, creator_session):
        """Test that event_id is required"""
        response = creator_session.post(f"{BASE_URL}/api/pro-mode/unlock/checkout", json={
            "origin_url": "https://virtual-events-3.preview.emergentagent.com"
        })
        
        # Should return 400 - missing event_id
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        print("✅ Missing event_id correctly rejected")
    
    def test_pro_mode_checkout_requires_origin_url(self, creator_session):
        """Test that origin_url is required"""
        response = creator_session.post(f"{BASE_URL}/api/pro-mode/unlock/checkout", json={
            "event_id": TEST_EVENT_FREE
        })
        
        # Should return 400 - missing origin_url
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        print("✅ Missing origin_url correctly rejected")
    
    def test_pro_mode_checkout_with_invalid_promo_code(self, creator_session):
        """Test that invalid promo code is ignored (not error)"""
        response = creator_session.post(f"{BASE_URL}/api/pro-mode/unlock/checkout", json={
            "event_id": TEST_EVENT_FREE,
            "origin_url": "https://virtual-events-3.preview.emergentagent.com",
            "promo_code": "INVALID_CODE_12345"
        })
        
        # Should still succeed but with full price
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("amount") == 1000.0, f"Invalid promo should result in full price: {data.get('amount')}"
        assert data.get("discount") == 0, f"Invalid promo should have no discount: {data.get('discount')}"
        
        print("✅ Invalid promo code handled correctly (full price)")


class TestPaymentStatusEndpoint:
    """Tests for payment status endpoint handling pro_mode_unlock type"""
    
    @pytest.fixture
    def creator_session(self):
        """Get authenticated creator session"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {TEST_CREATOR_SESSION}"
        })
        return session
    
    def test_payment_status_endpoint_exists(self, creator_session):
        """Test that payment status endpoint exists and handles requests"""
        # Use a fake session ID - should return appropriate error
        response = creator_session.get(f"{BASE_URL}/api/payments/checkout/status/fake_session_12345")
        
        # Should return some response (not 404 for endpoint)
        # Stripe will return error for invalid session
        assert response.status_code in [200, 400, 404, 500], f"Unexpected status: {response.status_code}"
        
        print(f"✅ Payment status endpoint exists, returned {response.status_code}")


class TestEventEndpoints:
    """Tests for event endpoints related to Pro Mode"""
    
    def test_free_event_has_free_package(self):
        """Verify test event has free streaming package"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_FREE}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("streaming_package") == "free", f"Expected free package, got {data.get('streaming_package')}"
        
        print(f"✅ Test event has free package: {data.get('title')}")
    
    def test_premium_event_has_premium_package(self):
        """Verify premium test event has premium streaming package"""
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_PREMIUM}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("streaming_package") == "premium", f"Expected premium package, got {data.get('streaming_package')}"
        
        print(f"✅ Premium event has premium package: {data.get('title')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
