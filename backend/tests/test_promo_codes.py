"""
Test suite for Promo Code functionality in ShowMeLive.online
Tests:
- Admin CRUD operations for promo codes
- Promo code validation with various conditions
- Start date and expiration date validation
- Max uses validation
- Discount type (percentage/fixed) calculations
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPromoCodeAdmin:
    """Admin promo code CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin session token"""
        # Login as admin
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "admin@showmelive.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["session_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Store created promo code IDs for cleanup
        self.created_promo_ids = []
        
        yield
        
        # Cleanup: Delete all test promo codes
        for promo_id in self.created_promo_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/admin/promo-codes/{promo_id}",
                    headers=self.admin_headers
                )
            except:
                pass
    
    def test_get_promo_codes_requires_admin(self):
        """GET /api/admin/promo-codes requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/promo-codes")
        assert response.status_code == 401
    
    def test_get_promo_codes_success(self):
        """GET /api/admin/promo-codes returns list of promo codes"""
        response = requests.get(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_promo_code_percentage(self):
        """POST /api/admin/promo-codes creates percentage discount code"""
        promo_data = {
            "code": "TEST_PERCENT50",
            "description": "Test 50% off",
            "discount_type": "percentage",
            "discount_value": 50,
            "applies_to": "pro_mode",
            "max_uses": 10
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["promo_code"]["code"] == "TEST_PERCENT50"
        assert data["promo_code"]["discount_type"] == "percentage"
        assert data["promo_code"]["discount_value"] == 50
        
        self.created_promo_ids.append(data["promo_code"]["id"])
    
    def test_create_promo_code_fixed(self):
        """POST /api/admin/promo-codes creates fixed discount code"""
        promo_data = {
            "code": "TEST_FIXED500",
            "description": "Test $500 off",
            "discount_type": "fixed",
            "discount_value": 500,
            "applies_to": "pro_mode"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["promo_code"]["discount_type"] == "fixed"
        assert data["promo_code"]["discount_value"] == 500
        
        self.created_promo_ids.append(data["promo_code"]["id"])
    
    def test_create_promo_code_with_dates(self):
        """POST /api/admin/promo-codes creates code with start and expiration dates"""
        start_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        expiration_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        promo_data = {
            "code": "TEST_DATED",
            "description": "Test dated promo",
            "discount_type": "percentage",
            "discount_value": 25,
            "applies_to": "pro_mode",
            "start_date": start_date,
            "expiration_date": expiration_date
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        
        self.created_promo_ids.append(data["promo_code"]["id"])
        
        # Verify the promo code was created with dates
        get_response = requests.get(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers
        )
        promos = get_response.json()
        created_promo = next((p for p in promos if p["code"] == "TEST_DATED"), None)
        assert created_promo is not None
        assert created_promo["start_date"] == start_date
        assert created_promo["expiration_date"] == expiration_date
    
    def test_create_promo_code_duplicate_fails(self):
        """POST /api/admin/promo-codes fails for duplicate code"""
        promo_data = {
            "code": "TEST_DUPLICATE",
            "discount_type": "percentage",
            "discount_value": 10
        }
        
        # Create first
        response1 = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        assert response1.status_code == 200
        self.created_promo_ids.append(response1.json()["promo_code"]["id"])
        
        # Try to create duplicate
        response2 = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"]
    
    def test_create_promo_code_invalid_percentage(self):
        """POST /api/admin/promo-codes fails for percentage > 100"""
        promo_data = {
            "code": "TEST_INVALID_PERCENT",
            "discount_type": "percentage",
            "discount_value": 150
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        
        assert response.status_code == 400
        assert "between 0 and 100" in response.json()["detail"]
    
    def test_update_promo_code(self):
        """PUT /api/admin/promo-codes/{id} updates promo code"""
        # Create a promo code first
        promo_data = {
            "code": "TEST_UPDATE",
            "discount_type": "percentage",
            "discount_value": 20
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        assert create_response.status_code == 200
        promo_id = create_response.json()["promo_code"]["id"]
        self.created_promo_ids.append(promo_id)
        
        # Update the promo code
        update_data = {
            "discount_value": 30,
            "description": "Updated description"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/promo-codes/{promo_id}",
            headers=self.admin_headers,
            json=update_data
        )
        
        assert update_response.status_code == 200
        assert update_response.json()["success"] == True
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers
        )
        promos = get_response.json()
        updated_promo = next((p for p in promos if p["id"] == promo_id), None)
        assert updated_promo is not None
        assert updated_promo["discount_value"] == 30
        assert updated_promo["description"] == "Updated description"
    
    def test_update_promo_code_toggle_active(self):
        """PUT /api/admin/promo-codes/{id} can toggle is_active"""
        # Create a promo code
        promo_data = {
            "code": "TEST_TOGGLE",
            "discount_type": "percentage",
            "discount_value": 15
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        promo_id = create_response.json()["promo_code"]["id"]
        self.created_promo_ids.append(promo_id)
        
        # Deactivate
        update_response = requests.put(
            f"{BASE_URL}/api/admin/promo-codes/{promo_id}",
            headers=self.admin_headers,
            json={"is_active": False}
        )
        assert update_response.status_code == 200
        
        # Verify deactivated
        get_response = requests.get(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers
        )
        promos = get_response.json()
        promo = next((p for p in promos if p["id"] == promo_id), None)
        assert promo["is_active"] == False
    
    def test_delete_promo_code(self):
        """DELETE /api/admin/promo-codes/{id} deletes promo code"""
        # Create a promo code
        promo_data = {
            "code": "TEST_DELETE",
            "discount_type": "percentage",
            "discount_value": 10
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        promo_id = create_response.json()["promo_code"]["id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/promo-codes/{promo_id}",
            headers=self.admin_headers
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] == True
        
        # Verify deleted
        get_response = requests.get(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers
        )
        promos = get_response.json()
        deleted_promo = next((p for p in promos if p["id"] == promo_id), None)
        assert deleted_promo is None
    
    def test_delete_promo_code_not_found(self):
        """DELETE /api/admin/promo-codes/{id} returns 404 for non-existent code"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/promo-codes/non-existent-id",
            headers=self.admin_headers
        )
        assert response.status_code == 404


class TestPromoCodeValidation:
    """Promo code validation tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin and user sessions"""
        # Login as admin
        admin_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "admin@showmelive.com", "password": "admin123"}
        )
        self.admin_token = admin_response.json()["session_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Create a test user session for validation
        import subprocess
        result = subprocess.run([
            "mongosh", "--quiet", "--eval", """
            use('test_database');
            var userId = 'test-promo-user-' + Date.now();
            var sessionToken = 'test_promo_session_' + Date.now();
            db.users.insertOne({
                id: userId,
                email: 'promo.test.' + Date.now() + '@example.com',
                name: 'Promo Test User',
                role: 'creator',
                created_at: new Date().toISOString()
            });
            db.user_sessions.insertOne({
                user_id: userId,
                session_token: sessionToken,
                expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
                created_at: new Date().toISOString()
            });
            print(sessionToken);
            """
        ], capture_output=True, text=True)
        self.user_token = result.stdout.strip().split('\n')[-1]
        self.user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        self.created_promo_ids = []
        
        yield
        
        # Cleanup
        for promo_id in self.created_promo_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/admin/promo-codes/{promo_id}",
                    headers=self.admin_headers
                )
            except:
                pass
    
    def test_validate_promo_code_requires_auth(self):
        """POST /api/promo-codes/validate requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/promo-codes/validate",
            json={"code": "TEST", "purchase_type": "pro_mode", "purchase_amount": 1000}
        )
        assert response.status_code == 401
    
    def test_validate_promo_code_percentage(self):
        """POST /api/promo-codes/validate calculates percentage discount correctly"""
        # Create promo code
        promo_data = {
            "code": "TEST_VALIDATE_PERCENT",
            "discount_type": "percentage",
            "discount_value": 50,
            "applies_to": "pro_mode"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        self.created_promo_ids.append(create_response.json()["promo_code"]["id"])
        
        # Validate
        validate_response = requests.post(
            f"{BASE_URL}/api/promo-codes/validate",
            headers=self.user_headers,
            json={"code": "TEST_VALIDATE_PERCENT", "purchase_type": "pro_mode", "purchase_amount": 1000}
        )
        
        assert validate_response.status_code == 200
        data = validate_response.json()
        assert data["valid"] == True
        assert data["discount_amount"] == 500  # 50% of 1000
        assert data["final_price"] == 500
    
    def test_validate_promo_code_fixed(self):
        """POST /api/promo-codes/validate calculates fixed discount correctly"""
        # Create promo code
        promo_data = {
            "code": "TEST_VALIDATE_FIXED",
            "discount_type": "fixed",
            "discount_value": 300,
            "applies_to": "pro_mode"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        self.created_promo_ids.append(create_response.json()["promo_code"]["id"])
        
        # Validate
        validate_response = requests.post(
            f"{BASE_URL}/api/promo-codes/validate",
            headers=self.user_headers,
            json={"code": "TEST_VALIDATE_FIXED", "purchase_type": "pro_mode", "purchase_amount": 1000}
        )
        
        assert validate_response.status_code == 200
        data = validate_response.json()
        assert data["valid"] == True
        assert data["discount_amount"] == 300
        assert data["final_price"] == 700
    
    def test_validate_promo_code_100_percent_free(self):
        """POST /api/promo-codes/validate handles 100% discount (free)"""
        # Create promo code
        promo_data = {
            "code": "TEST_FREE100",
            "discount_type": "percentage",
            "discount_value": 100,
            "applies_to": "pro_mode"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        self.created_promo_ids.append(create_response.json()["promo_code"]["id"])
        
        # Validate
        validate_response = requests.post(
            f"{BASE_URL}/api/promo-codes/validate",
            headers=self.user_headers,
            json={"code": "TEST_FREE100", "purchase_type": "pro_mode", "purchase_amount": 1000}
        )
        
        assert validate_response.status_code == 200
        data = validate_response.json()
        assert data["final_price"] == 0
    
    def test_validate_promo_code_invalid(self):
        """POST /api/promo-codes/validate returns 404 for invalid code"""
        validate_response = requests.post(
            f"{BASE_URL}/api/promo-codes/validate",
            headers=self.user_headers,
            json={"code": "INVALID_CODE_XYZ", "purchase_type": "pro_mode", "purchase_amount": 1000}
        )
        
        assert validate_response.status_code == 404
        assert "Invalid promo code" in validate_response.json()["detail"]
    
    def test_validate_promo_code_inactive(self):
        """POST /api/promo-codes/validate fails for inactive code"""
        # Create and deactivate promo code
        promo_data = {
            "code": "TEST_INACTIVE",
            "discount_type": "percentage",
            "discount_value": 20
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        promo_id = create_response.json()["promo_code"]["id"]
        self.created_promo_ids.append(promo_id)
        
        # Deactivate
        requests.put(
            f"{BASE_URL}/api/admin/promo-codes/{promo_id}",
            headers=self.admin_headers,
            json={"is_active": False}
        )
        
        # Try to validate
        validate_response = requests.post(
            f"{BASE_URL}/api/promo-codes/validate",
            headers=self.user_headers,
            json={"code": "TEST_INACTIVE", "purchase_type": "pro_mode", "purchase_amount": 1000}
        )
        
        assert validate_response.status_code == 400
        assert "no longer active" in validate_response.json()["detail"]
    
    def test_validate_promo_code_expired(self):
        """POST /api/promo-codes/validate fails for expired code"""
        # Create expired promo code
        past_date = (datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d")
        promo_data = {
            "code": "TEST_EXPIRED",
            "discount_type": "percentage",
            "discount_value": 20,
            "expiration_date": past_date
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        self.created_promo_ids.append(create_response.json()["promo_code"]["id"])
        
        # Try to validate
        validate_response = requests.post(
            f"{BASE_URL}/api/promo-codes/validate",
            headers=self.user_headers,
            json={"code": "TEST_EXPIRED", "purchase_type": "pro_mode", "purchase_amount": 1000}
        )
        
        assert validate_response.status_code == 400
        assert "expired" in validate_response.json()["detail"]
    
    def test_validate_promo_code_not_started(self):
        """POST /api/promo-codes/validate fails for code not yet active"""
        # Create future promo code
        future_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        promo_data = {
            "code": "TEST_FUTURE",
            "discount_type": "percentage",
            "discount_value": 20,
            "start_date": future_date
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        self.created_promo_ids.append(create_response.json()["promo_code"]["id"])
        
        # Try to validate
        validate_response = requests.post(
            f"{BASE_URL}/api/promo-codes/validate",
            headers=self.user_headers,
            json={"code": "TEST_FUTURE", "purchase_type": "pro_mode", "purchase_amount": 1000}
        )
        
        assert validate_response.status_code == 400
        assert "not yet active" in validate_response.json()["detail"]
    
    def test_validate_promo_code_max_uses_reached(self):
        """POST /api/promo-codes/validate fails when max uses reached"""
        # Create promo code with max_uses = 1
        promo_data = {
            "code": "TEST_MAXUSES",
            "discount_type": "percentage",
            "discount_value": 20,
            "max_uses": 1
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        promo_id = create_response.json()["promo_code"]["id"]
        self.created_promo_ids.append(promo_id)
        
        # Apply the code once
        apply_response = requests.post(
            f"{BASE_URL}/api/promo-codes/apply",
            headers=self.user_headers,
            json={"code": "TEST_MAXUSES", "purchase_type": "pro_mode", "purchase_amount": 1000}
        )
        assert apply_response.status_code == 200
        
        # Try to validate again (should fail)
        validate_response = requests.post(
            f"{BASE_URL}/api/promo-codes/validate",
            headers=self.user_headers,
            json={"code": "TEST_MAXUSES", "purchase_type": "pro_mode", "purchase_amount": 1000}
        )
        
        assert validate_response.status_code == 400
        assert "maximum uses" in validate_response.json()["detail"]
    
    def test_validate_promo_code_wrong_purchase_type(self):
        """POST /api/promo-codes/validate fails for wrong purchase type"""
        # Create promo code for pro_mode only
        promo_data = {
            "code": "TEST_PROMODE_ONLY",
            "discount_type": "percentage",
            "discount_value": 20,
            "applies_to": "pro_mode"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        self.created_promo_ids.append(create_response.json()["promo_code"]["id"])
        
        # Try to validate for ticket purchase
        validate_response = requests.post(
            f"{BASE_URL}/api/promo-codes/validate",
            headers=self.user_headers,
            json={"code": "TEST_PROMODE_ONLY", "purchase_type": "ticket", "purchase_amount": 100}
        )
        
        assert validate_response.status_code == 400
        assert "not valid for ticket" in validate_response.json()["detail"]
    
    def test_validate_promo_code_applies_to_all(self):
        """POST /api/promo-codes/validate works for 'all' applies_to"""
        # Create promo code for all purchases
        promo_data = {
            "code": "TEST_ALL_PURCHASES",
            "discount_type": "percentage",
            "discount_value": 10,
            "applies_to": "all"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        self.created_promo_ids.append(create_response.json()["promo_code"]["id"])
        
        # Validate for pro_mode
        validate_response1 = requests.post(
            f"{BASE_URL}/api/promo-codes/validate",
            headers=self.user_headers,
            json={"code": "TEST_ALL_PURCHASES", "purchase_type": "pro_mode", "purchase_amount": 1000}
        )
        assert validate_response1.status_code == 200
        
        # Validate for ticket
        validate_response2 = requests.post(
            f"{BASE_URL}/api/promo-codes/validate",
            headers=self.user_headers,
            json={"code": "TEST_ALL_PURCHASES", "purchase_type": "ticket", "purchase_amount": 50}
        )
        assert validate_response2.status_code == 200


class TestPromoCodeApply:
    """Promo code apply tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin and user sessions"""
        # Login as admin
        admin_response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "admin@showmelive.com", "password": "admin123"}
        )
        self.admin_token = admin_response.json()["session_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Create a test user session
        import subprocess
        result = subprocess.run([
            "mongosh", "--quiet", "--eval", """
            use('test_database');
            var userId = 'test-apply-user-' + Date.now();
            var sessionToken = 'test_apply_session_' + Date.now();
            db.users.insertOne({
                id: userId,
                email: 'apply.test.' + Date.now() + '@example.com',
                name: 'Apply Test User',
                role: 'creator',
                created_at: new Date().toISOString()
            });
            db.user_sessions.insertOne({
                user_id: userId,
                session_token: sessionToken,
                expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
                created_at: new Date().toISOString()
            });
            print(sessionToken);
            """
        ], capture_output=True, text=True)
        self.user_token = result.stdout.strip().split('\n')[-1]
        self.user_headers = {"Authorization": f"Bearer {self.user_token}"}
        
        self.created_promo_ids = []
        
        yield
        
        # Cleanup
        for promo_id in self.created_promo_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/admin/promo-codes/{promo_id}",
                    headers=self.admin_headers
                )
            except:
                pass
    
    def test_apply_promo_code_increments_usage(self):
        """POST /api/promo-codes/apply increments current_uses"""
        # Create promo code
        promo_data = {
            "code": "TEST_APPLY_COUNT",
            "discount_type": "percentage",
            "discount_value": 20,
            "max_uses": 10
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers,
            json=promo_data
        )
        promo_id = create_response.json()["promo_code"]["id"]
        self.created_promo_ids.append(promo_id)
        
        # Apply the code
        apply_response = requests.post(
            f"{BASE_URL}/api/promo-codes/apply",
            headers=self.user_headers,
            json={"code": "TEST_APPLY_COUNT", "purchase_type": "pro_mode", "purchase_amount": 1000}
        )
        assert apply_response.status_code == 200
        
        # Check usage count increased
        get_response = requests.get(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.admin_headers
        )
        promos = get_response.json()
        promo = next((p for p in promos if p["id"] == promo_id), None)
        assert promo["current_uses"] == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
