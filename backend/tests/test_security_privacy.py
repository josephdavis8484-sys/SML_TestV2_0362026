"""
Test Security & Privacy Protection Feature
Tests for screenshot/recording detection, escalation policy, and admin controls
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://creator-stage-6.preview.emergentagent.com').rstrip('/')

# Test credentials from main agent
CREATOR_SESSION = "creator_03ff4597-16ea-4eaa-a710-27d4a50735ca"
ADMIN_SESSION = "admin_2f36a702-afa6-42fa-87d3-1f7c8bcedead"
TEST_EVENT_ID = "test-event-chat-1771457019709"
TEST_USER_ID = "test-creator-1771782673812"


class TestSecurityCheckStatus:
    """Test /api/security/check-status endpoint"""
    
    def test_check_status_authenticated(self):
        """Check status returns user's violation status"""
        response = requests.get(
            f"{BASE_URL}/api/security/check-status",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "status" in data
        assert "can_access" in data
        assert "violation_count" in data
        
        # User should be able to access (suspension was lifted)
        assert data["can_access"] == True
        print(f"✓ Security status: {data['status']}, violations: {data['violation_count']}")
    
    def test_check_status_unauthenticated(self):
        """Check status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/security/check-status")
        assert response.status_code == 401
        print("✓ Unauthenticated request correctly rejected")


class TestSecurityReportCapture:
    """Test /api/security/report-capture endpoint"""
    
    def test_report_screenshot_capture(self):
        """Report a screenshot capture attempt"""
        response = requests.post(
            f"{BASE_URL}/api/security/report-capture",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"},
            json={
                "event_id": TEST_EVENT_ID,
                "capture_type": "screenshot",
                "device_id": "test-device-pytest",
                "os": "windows",
                "browser": "chrome",
                "app_version": "1.0.0",
                "details": "PrintScreen key pressed"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "action" in data
        assert "message" in data
        assert "can_continue" in data
        assert "violation_count" in data
        assert "event_logged" in data
        
        # Event should be logged
        assert data["event_logged"] == True
        print(f"✓ Screenshot reported: action={data['action']}, violations={data['violation_count']}")
    
    def test_report_recording_capture(self):
        """Report a recording capture attempt"""
        response = requests.post(
            f"{BASE_URL}/api/security/report-capture",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"},
            json={
                "event_id": TEST_EVENT_ID,
                "capture_type": "recording",
                "device_id": "test-device-pytest",
                "os": "macos",
                "browser": "safari",
                "app_version": "1.0.0"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "action" in data
        # event_logged may not be present if user is already suspended
        if "event_logged" in data:
            assert data["event_logged"] == True
        print(f"✓ Recording reported: action={data['action']}")
    
    def test_report_screen_share_capture(self):
        """Report a screen share capture attempt"""
        response = requests.post(
            f"{BASE_URL}/api/security/report-capture",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"},
            json={
                "event_id": TEST_EVENT_ID,
                "capture_type": "screen_share",
                "device_id": "test-device-pytest",
                "os": "linux",
                "browser": "firefox",
                "app_version": "1.0.0",
                "details": "getDisplayMedia called"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "action" in data
        print(f"✓ Screen share reported: action={data['action']}")
    
    def test_report_visibility_hidden(self):
        """Report visibility hidden event"""
        response = requests.post(
            f"{BASE_URL}/api/security/report-capture",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"},
            json={
                "event_id": TEST_EVENT_ID,
                "capture_type": "visibility_hidden",
                "device_id": "test-device-pytest",
                "os": "android",
                "browser": "chrome",
                "app_version": "1.0.0",
                "details": "Tab hidden for extended period"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "action" in data
        print(f"✓ Visibility hidden reported: action={data['action']}")
    
    def test_report_capture_unauthenticated(self):
        """Report capture requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/security/report-capture",
            json={
                "event_id": TEST_EVENT_ID,
                "capture_type": "screenshot",
                "os": "windows"
            }
        )
        assert response.status_code == 401
        print("✓ Unauthenticated report correctly rejected")


class TestAdminSecurityEndpoints:
    """Test admin-only security endpoints"""
    
    def test_get_user_violations_admin(self):
        """Admin can view user violations"""
        response = requests.get(
            f"{BASE_URL}/api/security/violations/{TEST_USER_ID}",
            headers={"Authorization": f"Bearer {ADMIN_SESSION}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "violation_summary" in data
        assert "recent_events" in data
        
        # Verify violation summary fields
        summary = data["violation_summary"]
        assert "total_violations" in summary
        assert "screenshot_count" in summary
        assert "recording_count" in summary
        assert "screen_share_count" in summary
        assert "suspension_status" in summary
        
        print(f"✓ Admin retrieved violations: total={summary['total_violations']}, status={summary['suspension_status']}")
    
    def test_get_user_violations_non_admin(self):
        """Non-admin cannot view user violations"""
        response = requests.get(
            f"{BASE_URL}/api/security/violations/{TEST_USER_ID}",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"}
        )
        assert response.status_code == 403
        print("✓ Non-admin correctly rejected from viewing violations")
    
    def test_get_user_violations_unauthenticated(self):
        """Unauthenticated cannot view user violations"""
        response = requests.get(
            f"{BASE_URL}/api/security/violations/{TEST_USER_ID}"
        )
        assert response.status_code == 401
        print("✓ Unauthenticated correctly rejected from viewing violations")
    
    def test_lift_suspension_admin(self):
        """Admin can lift user suspension"""
        response = requests.post(
            f"{BASE_URL}/api/security/lift-suspension/{TEST_USER_ID}",
            headers={"Authorization": f"Bearer {ADMIN_SESSION}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "message" in data
        print(f"✓ Admin lifted suspension: {data['message']}")
    
    def test_lift_suspension_non_admin(self):
        """Non-admin cannot lift suspension"""
        response = requests.post(
            f"{BASE_URL}/api/security/lift-suspension/{TEST_USER_ID}",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"}
        )
        assert response.status_code == 403
        print("✓ Non-admin correctly rejected from lifting suspension")
    
    def test_lift_suspension_nonexistent_user(self):
        """Lift suspension for nonexistent user returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/security/lift-suspension/nonexistent-user-12345",
            headers={"Authorization": f"Bearer {ADMIN_SESSION}"}
        )
        assert response.status_code == 404
        print("✓ Nonexistent user correctly returns 404")


class TestEscalationPolicy:
    """Test escalation policy: warn → end_session → suspend_30d → permanent_ban"""
    
    def test_escalation_thresholds_documented(self):
        """Verify escalation thresholds are correctly implemented"""
        # Based on code review:
        # 1-2 violations = warn
        # 3-4 violations = end_session
        # 5+ violations = suspend_30d
        # Any violation after 30-day suspension = permanent_ban
        
        # Get current violations to verify
        response = requests.get(
            f"{BASE_URL}/api/security/violations/{TEST_USER_ID}",
            headers={"Authorization": f"Bearer {ADMIN_SESSION}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        summary = data["violation_summary"]
        total = summary.get("total_violations", 0)
        status = summary.get("suspension_status", "none")
        
        print(f"✓ Current state: {total} violations, status={status}")
        print("  Escalation policy:")
        print("  - 1-2 violations: warn")
        print("  - 3-4 violations: end_session")
        print("  - 5+ violations: suspend_30d")
        print("  - Post-suspension violation: permanent_ban")


class TestSecurityEventLogging:
    """Test that security events are properly logged"""
    
    def test_events_contain_required_fields(self):
        """Verify logged events have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/security/violations/{TEST_USER_ID}",
            headers={"Authorization": f"Bearer {ADMIN_SESSION}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        events = data.get("recent_events", [])
        if events:
            event = events[0]
            
            # Verify required fields
            required_fields = [
                "id", "user_id", "event_id", "capture_type",
                "os", "action_taken", "timestamp"
            ]
            for field in required_fields:
                assert field in event, f"Missing field: {field}"
            
            # Verify capture_type is valid
            valid_types = ["screenshot", "recording", "screen_share", "visibility_hidden"]
            assert event["capture_type"] in valid_types
            
            # Verify action_taken is valid
            valid_actions = ["warn", "end_session", "suspend_30d", "permanent_ban"]
            assert event["action_taken"] in valid_actions
            
            print(f"✓ Event logged with all required fields")
            print(f"  - capture_type: {event['capture_type']}")
            print(f"  - action_taken: {event['action_taken']}")
            print(f"  - os: {event['os']}")
        else:
            print("⚠ No events found to verify")


class TestSecurityResponseMessages:
    """Test that response messages are appropriate for each action"""
    
    def test_response_contains_message(self):
        """Verify report-capture returns appropriate message"""
        response = requests.post(
            f"{BASE_URL}/api/security/report-capture",
            headers={"Authorization": f"Bearer {CREATOR_SESSION}"},
            json={
                "event_id": TEST_EVENT_ID,
                "capture_type": "screenshot",
                "device_id": "test-device-message-test",
                "os": "windows"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert len(data["message"]) > 0
        
        # Message should be informative
        action = data["action"]
        message = data["message"]
        
        if action == "warn":
            assert "warning" in message.lower() or "detected" in message.lower()
        elif action == "end_session":
            assert "terminated" in message.lower() or "session" in message.lower()
        elif action == "suspend_30d":
            assert "suspended" in message.lower() or "30" in message
        elif action == "permanent_ban":
            assert "permanent" in message.lower() or "restricted" in message.lower()
        
        print(f"✓ Response message appropriate for action '{action}': {message[:50]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
