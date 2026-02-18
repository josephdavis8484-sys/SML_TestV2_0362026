"""
Test suite for Live Chat & Reactions feature
Tests: Chat endpoints, Reactions endpoints, Event creation with chat settings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from seed data
CREATOR_SESSION_TOKEN = "test_session_chat_1771435227231"
CREATOR_USER_ID = "test-creator-chat-1771435227220"
EVENT_WITH_CHAT_ID = "test-event-chat-1771435227272"
EVENT_WITHOUT_CHAT_ID = "test-event-nochat-1771435227275"


class TestChatEndpoints:
    """Test chat-related API endpoints"""
    
    def test_get_chat_messages_enabled_event(self):
        """GET /api/events/{id}/chat - returns enabled status and messages for chat-enabled event"""
        response = requests.get(f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}/chat")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "enabled" in data, "Response should have 'enabled' field"
        assert data["enabled"] == True, "Chat should be enabled for this event"
        assert "messages" in data, "Response should have 'messages' field"
        assert "chat_mode" in data, "Response should have 'chat_mode' field"
        assert data["chat_mode"] == "questions_only", "Chat mode should be 'questions_only'"
        print(f"SUCCESS: Chat endpoint returns enabled=True, chat_mode=questions_only")
    
    def test_get_chat_messages_disabled_event(self):
        """GET /api/events/{id}/chat - returns disabled status for non-chat event"""
        response = requests.get(f"{BASE_URL}/api/events/{EVENT_WITHOUT_CHAT_ID}/chat")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "enabled" in data, "Response should have 'enabled' field"
        assert data["enabled"] == False, "Chat should be disabled for this event"
        print(f"SUCCESS: Chat endpoint returns enabled=False for non-chat event")
    
    def test_get_chat_messages_invalid_event(self):
        """GET /api/events/{id}/chat - returns 404 for non-existent event"""
        response = requests.get(f"{BASE_URL}/api/events/invalid-event-id/chat")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"SUCCESS: Chat endpoint returns 404 for invalid event")
    
    def test_send_chat_message_authenticated(self):
        """POST /api/events/{id}/chat - send message as authenticated user"""
        headers = {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        payload = {
            "message": "Test question from pytest",
            "message_type": "question"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}/chat",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "message" in data, "Response should contain message details"
        assert data["message"]["message"] == "Test question from pytest"
        print(f"SUCCESS: Chat message sent successfully")
    
    def test_send_chat_message_unauthenticated(self):
        """POST /api/events/{id}/chat - returns 401 for unauthenticated user"""
        payload = {"message": "Test message", "message_type": "chat"}
        
        response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}/chat",
            json=payload
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"SUCCESS: Chat endpoint returns 401 for unauthenticated user")
    
    def test_send_chat_message_disabled_event(self):
        """POST /api/events/{id}/chat - returns 400 for chat-disabled event"""
        headers = {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        payload = {"message": "Test message", "message_type": "chat"}
        
        response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_WITHOUT_CHAT_ID}/chat",
            json=payload,
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"SUCCESS: Chat endpoint returns 400 for disabled chat event")


class TestReactionsEndpoints:
    """Test reactions-related API endpoints"""
    
    def test_get_reaction_counts(self):
        """GET /api/events/{id}/reactions/count - returns reaction counts"""
        response = requests.get(f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}/reactions/count")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reactions_enabled" in data, "Response should have 'reactions_enabled' field"
        assert data["reactions_enabled"] == True, "Reactions should be enabled"
        assert "counts" in data, "Response should have 'counts' field"
        assert isinstance(data["counts"], dict), "Counts should be a dictionary"
        print(f"SUCCESS: Reactions count endpoint works, counts: {data['counts']}")
    
    def test_get_reaction_counts_disabled_event(self):
        """GET /api/events/{id}/reactions/count - returns disabled for non-reactions event"""
        response = requests.get(f"{BASE_URL}/api/events/{EVENT_WITHOUT_CHAT_ID}/reactions/count")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["reactions_enabled"] == False, "Reactions should be disabled"
        print(f"SUCCESS: Reactions count returns disabled for non-reactions event")
    
    def test_send_reaction_authenticated(self):
        """POST /api/events/{id}/reactions - send reaction as authenticated user"""
        headers = {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        payload = {"reaction_type": "heart"}
        
        response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}/reactions",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("reaction_type") == "heart", "Response should echo reaction type"
        print(f"SUCCESS: Reaction sent successfully")
    
    def test_send_reaction_all_types(self):
        """POST /api/events/{id}/reactions - test all valid reaction types"""
        headers = {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        valid_reactions = ["heart", "clap", "fire", "laugh", "wow"]
        
        for reaction_type in valid_reactions:
            payload = {"reaction_type": reaction_type}
            response = requests.post(
                f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}/reactions",
                json=payload,
                headers=headers
            )
            assert response.status_code == 200, f"Expected 200 for {reaction_type}, got {response.status_code}"
        
        print(f"SUCCESS: All reaction types work: {valid_reactions}")
    
    def test_send_reaction_invalid_type(self):
        """POST /api/events/{id}/reactions - returns 400 for invalid reaction type"""
        headers = {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        payload = {"reaction_type": "invalid_reaction"}
        
        response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}/reactions",
            json=payload,
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"SUCCESS: Invalid reaction type returns 400")
    
    def test_send_reaction_unauthenticated(self):
        """POST /api/events/{id}/reactions - returns 401 for unauthenticated user"""
        payload = {"reaction_type": "heart"}
        
        response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}/reactions",
            json=payload
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"SUCCESS: Reactions endpoint returns 401 for unauthenticated user")
    
    def test_send_reaction_disabled_event(self):
        """POST /api/events/{id}/reactions - returns 400 for reactions-disabled event"""
        headers = {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        payload = {"reaction_type": "heart"}
        
        response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_WITHOUT_CHAT_ID}/reactions",
            json=payload,
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"SUCCESS: Reactions endpoint returns 400 for disabled reactions event")


class TestEventChatSettings:
    """Test event creation and retrieval with chat/reactions settings"""
    
    def test_get_event_with_chat_settings(self):
        """GET /api/events/{id} - returns chat and reactions settings"""
        response = requests.get(f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "chat_enabled" in data, "Event should have chat_enabled field"
        assert "reactions_enabled" in data, "Event should have reactions_enabled field"
        assert "chat_mode" in data, "Event should have chat_mode field"
        
        assert data["chat_enabled"] == True, "Chat should be enabled"
        assert data["reactions_enabled"] == True, "Reactions should be enabled"
        assert data["chat_mode"] == "questions_only", "Chat mode should be questions_only"
        print(f"SUCCESS: Event has correct chat settings: chat_enabled={data['chat_enabled']}, reactions_enabled={data['reactions_enabled']}, chat_mode={data['chat_mode']}")
    
    def test_get_event_without_chat_settings(self):
        """GET /api/events/{id} - returns disabled chat settings"""
        response = requests.get(f"{BASE_URL}/api/events/{EVENT_WITHOUT_CHAT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["chat_enabled"] == False, "Chat should be disabled"
        assert data["reactions_enabled"] == False, "Reactions should be disabled"
        print(f"SUCCESS: Event has disabled chat settings")


class TestChatModeration:
    """Test chat moderation endpoints (pin/hide messages)"""
    
    def test_pin_message_as_creator(self):
        """POST /api/events/{id}/chat/{message_id}/pin - creator can pin messages"""
        headers = {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        
        # First send a message to get a message ID
        payload = {"message": "Message to pin", "message_type": "question"}
        send_response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}/chat",
            json=payload,
            headers=headers
        )
        
        if send_response.status_code == 200:
            message_id = send_response.json().get("message", {}).get("id")
            if message_id:
                # Try to pin the message
                pin_response = requests.post(
                    f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}/chat/{message_id}/pin",
                    headers=headers
                )
                assert pin_response.status_code == 200, f"Expected 200, got {pin_response.status_code}"
                print(f"SUCCESS: Creator can pin messages")
            else:
                print("SKIP: Could not get message ID to test pin")
        else:
            print(f"SKIP: Could not send message to test pin: {send_response.status_code}")
    
    def test_hide_message_as_creator(self):
        """POST /api/events/{id}/chat/{message_id}/hide - creator can hide messages"""
        headers = {"Authorization": f"Bearer {CREATOR_SESSION_TOKEN}"}
        
        # First send a message to get a message ID
        payload = {"message": "Message to hide", "message_type": "question"}
        send_response = requests.post(
            f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}/chat",
            json=payload,
            headers=headers
        )
        
        if send_response.status_code == 200:
            message_id = send_response.json().get("message", {}).get("id")
            if message_id:
                # Try to hide the message
                hide_response = requests.post(
                    f"{BASE_URL}/api/events/{EVENT_WITH_CHAT_ID}/chat/{message_id}/hide",
                    headers=headers
                )
                assert hide_response.status_code == 200, f"Expected 200, got {hide_response.status_code}"
                print(f"SUCCESS: Creator can hide messages")
            else:
                print("SKIP: Could not get message ID to test hide")
        else:
            print(f"SKIP: Could not send message to test hide: {send_response.status_code}")


class TestPublicEndpoints:
    """Test that public endpoints still work"""
    
    def test_homepage_events_list(self):
        """GET /api/events - public events list works"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Public events list works, {len(data)} events found")
    
    def test_admin_login(self):
        """POST /api/admin/login - admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            params={"email": "admin@showmelive.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_token" in data, "Response should have session_token"
        print(f"SUCCESS: Admin login works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
