"""
Test City/State Geo-Fencing Features for ShowMeLive
Tests:
- /api/events/search/location endpoint
- Event creation with geo fields (city, state, latitude, longitude, geo_restricted, geo_radius_meters)
- /api/events/{event_id}/check-geo endpoint with radius-based validation
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGeoLocationSearch:
    """Test the location search endpoint"""
    
    def test_search_location_no_params(self):
        """Test search with no parameters returns all events"""
        response = requests.get(f"{BASE_URL}/api/events/search/location")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert "count" in data
        assert "filters" in data
        print(f"SUCCESS: Search with no params returned {data['count']} events")
    
    def test_search_location_by_city(self):
        """Test search by city only"""
        response = requests.get(f"{BASE_URL}/api/events/search/location?city=Los")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert data["filters"]["city"] == "Los"
        print(f"SUCCESS: Search by city 'Los' returned {data['count']} events")
    
    def test_search_location_by_state(self):
        """Test search by state only"""
        response = requests.get(f"{BASE_URL}/api/events/search/location?state=CA")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert data["filters"]["state"] == "CA"
        print(f"SUCCESS: Search by state 'CA' returned {data['count']} events")
    
    def test_search_location_by_city_and_state(self):
        """Test search by both city and state"""
        response = requests.get(f"{BASE_URL}/api/events/search/location?city=San&state=CA")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert data["filters"]["city"] == "San"
        assert data["filters"]["state"] == "CA"
        print(f"SUCCESS: Search by city 'San' and state 'CA' returned {data['count']} events")


class TestEventGeoFields:
    """Test event creation and retrieval with geo fields"""
    
    @pytest.fixture(scope="class")
    def creator_session(self):
        """Create a test creator user and session"""
        import subprocess
        timestamp = str(int(time.time() * 1000))
        result = subprocess.run([
            'mongosh', '--quiet', '--eval', f'''
            use('test_database');
            var userId = 'test-creator-geo-{timestamp}';
            var sessionToken = 'test_session_geo_{timestamp}';
            db.users.insertOne({{
              id: userId,
              email: 'test.creator.geo.{timestamp}@example.com',
              name: 'Test Creator Geo',
              picture: 'https://via.placeholder.com/150',
              role: 'creator',
              created_at: new Date().toISOString()
            }});
            db.user_sessions.insertOne({{
              user_id: userId,
              session_token: sessionToken,
              expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
              created_at: new Date().toISOString()
            }});
            print(sessionToken);
            '''
        ], capture_output=True, text=True)
        session_token = result.stdout.strip().split('\n')[-1]
        return session_token
    
    def test_create_event_with_geo_fields(self, creator_session):
        """Test creating an event with city/state geo-fencing fields"""
        headers = {"Authorization": f"Bearer {creator_session}"}
        event_data = {
            "title": "Test Geo Event",
            "category": "Music",
            "date": "2026-03-15",
            "time": "19:00",
            "description": "Test event with geo-fencing",
            "venue": "Test Venue",
            "price": 25.0,
            "streaming_package": "free",
            "geo_restricted": True,
            "city": "San Francisco",
            "state": "CA",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "geo_radius_meters": 1000
        }
        
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        
        # Verify the event was created with geo fields
        event_id = data["id"]
        get_response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        event = get_response.json()
        
        assert event["geo_restricted"] == True
        assert event["city"] == "San Francisco"
        assert event["state"] == "CA"
        assert event["latitude"] == 37.7749
        assert event["longitude"] == -122.4194
        assert event["geo_radius_meters"] == 1000
        
        print(f"SUCCESS: Created event with geo fields - ID: {event_id}")
        return event_id
    
    def test_create_event_without_geo_restriction(self, creator_session):
        """Test creating an event without geo-restriction"""
        headers = {"Authorization": f"Bearer {creator_session}"}
        event_data = {
            "title": "Test Non-Geo Event",
            "category": "Comedy",
            "date": "2026-03-20",
            "time": "20:00",
            "description": "Test event without geo-fencing",
            "venue": "Test Venue 2",
            "price": 30.0,
            "streaming_package": "free",
            "geo_restricted": False
        }
        
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        
        # Verify the event was created without geo restriction
        event_id = data["id"]
        get_response = requests.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        event = get_response.json()
        
        assert event["geo_restricted"] == False
        print(f"SUCCESS: Created event without geo restriction - ID: {event_id}")
        return event_id


class TestGeoCheckEndpoint:
    """Test the geo-check endpoint for radius-based validation"""
    
    @pytest.fixture(scope="class")
    def geo_event(self):
        """Create a geo-restricted event for testing"""
        import subprocess
        timestamp = str(int(time.time() * 1000))
        
        # Create creator session
        result = subprocess.run([
            'mongosh', '--quiet', '--eval', f'''
            use('test_database');
            var userId = 'test-creator-geocheck-{timestamp}';
            var sessionToken = 'test_session_geocheck_{timestamp}';
            db.users.insertOne({{
              id: userId,
              email: 'test.creator.geocheck.{timestamp}@example.com',
              name: 'Test Creator GeoCheck',
              picture: 'https://via.placeholder.com/150',
              role: 'creator',
              created_at: new Date().toISOString()
            }});
            db.user_sessions.insertOne({{
              user_id: userId,
              session_token: sessionToken,
              expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
              created_at: new Date().toISOString()
            }});
            print(sessionToken);
            '''
        ], capture_output=True, text=True)
        session_token = result.stdout.strip().split('\n')[-1]
        
        # Create geo-restricted event
        headers = {"Authorization": f"Bearer {session_token}"}
        event_data = {
            "title": "Test GeoCheck Event",
            "category": "Music",
            "date": "2026-04-01",
            "time": "19:00",
            "description": "Test event for geo-check",
            "venue": "San Francisco Venue",
            "price": 50.0,
            "streaming_package": "free",
            "geo_restricted": True,
            "city": "San Francisco",
            "state": "CA",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "geo_radius_meters": 1000
        }
        
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        assert response.status_code == 200
        return response.json()["id"]
    
    @pytest.fixture(scope="class")
    def non_geo_event(self):
        """Create a non-geo-restricted event for testing"""
        import subprocess
        timestamp = str(int(time.time() * 1000))
        
        # Create creator session
        result = subprocess.run([
            'mongosh', '--quiet', '--eval', f'''
            use('test_database');
            var userId = 'test-creator-nongeo-{timestamp}';
            var sessionToken = 'test_session_nongeo_{timestamp}';
            db.users.insertOne({{
              id: userId,
              email: 'test.creator.nongeo.{timestamp}@example.com',
              name: 'Test Creator NonGeo',
              picture: 'https://via.placeholder.com/150',
              role: 'creator',
              created_at: new Date().toISOString()
            }});
            db.user_sessions.insertOne({{
              user_id: userId,
              session_token: sessionToken,
              expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
              created_at: new Date().toISOString()
            }});
            print(sessionToken);
            '''
        ], capture_output=True, text=True)
        session_token = result.stdout.strip().split('\n')[-1]
        
        # Create non-geo-restricted event
        headers = {"Authorization": f"Bearer {session_token}"}
        event_data = {
            "title": "Test NonGeo Event",
            "category": "Comedy",
            "date": "2026-04-05",
            "time": "20:00",
            "description": "Test event without geo-restriction",
            "venue": "Open Venue",
            "price": 25.0,
            "streaming_package": "free",
            "geo_restricted": False
        }
        
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_check_geo_non_restricted_event(self, non_geo_event):
        """Test geo-check for non-restricted event returns allowed"""
        response = requests.post(f"{BASE_URL}/api/events/{non_geo_event}/check-geo")
        assert response.status_code == 200
        data = response.json()
        assert data["allowed"] == True
        assert "worldwide" in data["message"].lower()
        print(f"SUCCESS: Non-restricted event allows access worldwide")
    
    def test_check_geo_within_radius(self, geo_event):
        """Test geo-check for user within 1000m radius"""
        # San Francisco coordinates (very close to event location)
        user_lat = 37.7750  # ~100m from event
        user_lon = -122.4195
        
        response = requests.post(
            f"{BASE_URL}/api/events/{geo_event}/check-geo",
            params={"user_lat": user_lat, "user_lon": user_lon}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["allowed"] == True
        assert "within" in data["message"].lower()
        assert "distance_meters" in data
        assert data["distance_meters"] < 1000
        print(f"SUCCESS: User within radius allowed - distance: {data['distance_meters']}m")
    
    def test_check_geo_outside_radius(self, geo_event):
        """Test geo-check for user outside 1000m radius"""
        # Los Angeles coordinates (far from San Francisco)
        user_lat = 34.0522
        user_lon = -118.2437
        
        response = requests.post(
            f"{BASE_URL}/api/events/{geo_event}/check-geo",
            params={"user_lat": user_lat, "user_lon": user_lon}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["allowed"] == False
        assert "only available within" in data["message"].lower()
        assert "distance_meters" in data
        assert data["distance_meters"] > 1000
        print(f"SUCCESS: User outside radius denied - distance: {data['distance_meters']}m")
    
    def test_check_geo_no_coordinates(self, geo_event):
        """Test geo-check without user coordinates requires location"""
        response = requests.post(f"{BASE_URL}/api/events/{geo_event}/check-geo")
        assert response.status_code == 200
        data = response.json()
        assert data["allowed"] == False
        assert data.get("requires_location") == True
        print(f"SUCCESS: Geo-check without coordinates requires location")
    
    def test_check_geo_event_not_found(self):
        """Test geo-check for non-existent event returns 404"""
        response = requests.post(f"{BASE_URL}/api/events/non-existent-event-id/check-geo")
        assert response.status_code == 404
        print(f"SUCCESS: Non-existent event returns 404")


class TestEventLocationsEndpoint:
    """Test the locations aggregation endpoint"""
    
    def test_get_event_locations(self):
        """Test getting unique cities and states with events"""
        response = requests.get(f"{BASE_URL}/api/events/locations")
        assert response.status_code == 200
        data = response.json()
        assert "cities" in data
        assert "states" in data
        assert isinstance(data["cities"], list)
        assert isinstance(data["states"], list)
        print(f"SUCCESS: Got {len(data['cities'])} cities and {len(data['states'])} states")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
