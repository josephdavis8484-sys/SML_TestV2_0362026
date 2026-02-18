import requests
import sys
import json
from datetime import datetime

class ShowMeAPITester:
    def __init__(self, base_url="https://livestream-hub-76.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code} - {response.text}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_events_api(self):
        """Test events endpoints"""
        print("\n📅 Testing Events API...")
        
        # Test get all events
        success, events = self.run_test(
            "Get All Events",
            "GET",
            "events",
            200
        )
        
        if success and events:
            print(f"   Found {len(events)} events")
            
            # Test get single event
            if len(events) > 0:
                event_id = events[0]['id']
                self.run_test(
                    "Get Single Event",
                    "GET",
                    f"events/{event_id}",
                    200
                )
                
                # Test get events by category
                category = events[0]['category']
                self.run_test(
                    f"Get Events by Category ({category})",
                    "GET",
                    f"events/category/{category}",
                    200
                )
        
        # Test non-existent event
        self.run_test(
            "Get Non-existent Event",
            "GET",
            "events/non-existent-id",
            404
        )

    def test_auth_api(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Auth API...")
        
        # Test /auth/me without token (should fail)
        self.run_test(
            "Get User Info (No Auth)",
            "GET",
            "auth/me",
            401
        )
        
        # Test session creation with invalid session_id
        self.run_test(
            "Create Session (Invalid)",
            "POST",
            "auth/session",
            401,
            data={"session_id": "invalid-session-id"}
        )
        
        # Test logout without session
        self.run_test(
            "Logout (No Session)",
            "POST",
            "auth/logout",
            200
        )

    def test_tickets_api_without_auth(self):
        """Test tickets endpoints without authentication"""
        print("\n🎫 Testing Tickets API (No Auth)...")
        
        # Test get tickets without auth
        self.run_test(
            "Get Tickets (No Auth)",
            "GET",
            "tickets",
            401
        )
        
        # Test purchase ticket without auth
        self.run_test(
            "Purchase Ticket (No Auth)",
            "POST",
            "tickets",
            401,
            data={"event_id": "test-event", "quantity": 1}
        )

    def create_test_session(self):
        """Create a test session for authenticated endpoints"""
        print("\n🔧 Creating test session...")
        
        # This would normally require a valid Emergent Auth session_id
        # For testing, we'll create a mock session directly in the database
        # This is a simplified approach for testing purposes
        
        # Note: In a real scenario, you'd need to go through the OAuth flow
        print("   Note: Auth testing requires valid Emergent Auth session_id")
        print("   Skipping authenticated endpoint tests")
        return False

    def test_cors_headers(self):
        """Test CORS configuration"""
        print("\n🌐 Testing CORS Headers...")
        
        try:
            response = requests.options(f"{self.api_url}/events", timeout=10)
            headers = response.headers
            
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            
            cors_present = any(header in headers for header in cors_headers)
            self.log_test("CORS Headers Present", cors_present)
            
        except Exception as e:
            self.log_test("CORS Headers Test", False, str(e))

    def test_health_check(self):
        """Test basic connectivity"""
        print("\n❤️ Testing Basic Connectivity...")
        
        try:
            response = requests.get(self.base_url, timeout=10)
            success = response.status_code in [200, 404]  # 404 is OK for root path
            self.log_test("Backend Connectivity", success)
        except Exception as e:
            self.log_test("Backend Connectivity", False, str(e))

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting ShowMe Live Events API Tests")
        print(f"   Base URL: {self.base_url}")
        print("=" * 60)
        
        # Basic connectivity
        self.test_health_check()
        
        # CORS
        self.test_cors_headers()
        
        # Public endpoints
        self.test_events_api()
        
        # Auth endpoints (without valid auth)
        self.test_auth_api()
        
        # Protected endpoints (without auth)
        self.test_tickets_api_without_auth()
        
        # Try to create test session
        has_auth = self.create_test_session()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed")
            return 1

    def get_test_report(self):
        """Get detailed test report"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": f"{(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%",
            "test_results": self.test_results,
            "timestamp": datetime.now().isoformat()
        }

def main():
    tester = ShowMeAPITester()
    exit_code = tester.run_all_tests()
    
    # Save test report
    report = tester.get_test_report()
    with open('/app/backend_test_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Test report saved to: /app/backend_test_report.json")
    return exit_code

if __name__ == "__main__":
    sys.exit(main())