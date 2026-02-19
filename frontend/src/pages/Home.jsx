import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import EventRow from "@/components/EventRow";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Info, Search, MapPin, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

// US States for dropdown
const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }, { code: "DC", name: "Washington D.C." }
];

const Home = ({ user, onLogout }) => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [featuredEventIndex, setFeaturedEventIndex] = useState(0);
  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Auto-cycle through featured events every 5 seconds
    const displayEvents = filteredEvents.length > 0 ? filteredEvents : events;
    if (displayEvents.length > 0) {
      const interval = setInterval(() => {
        setFeaturedEventIndex((prevIndex) => (prevIndex + 1) % Math.min(displayEvents.length, 10));
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [events, filteredEvents]);

  const fetchEvents = async () => {
    try {
      const response = await axiosInstance.get("/events");
      setEvents(response.data);
      setFilteredEvents([]);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const searchByLocation = async () => {
    if (!searchCity && !searchState) {
      // If no search criteria, reset to show all events
      setFilteredEvents([]);
      setFeaturedEventIndex(0);
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchCity) params.append("city", searchCity);
      if (searchState) params.append("state", searchState);
      
      const response = await axiosInstance.get(`/events/search/location?${params.toString()}`);
      setFilteredEvents(response.data);
      setFeaturedEventIndex(0);
    } catch (error) {
      console.error("Error searching events:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchCity("");
    setSearchState("");
    setFilteredEvents([]);
    setFeaturedEventIndex(0);
    setShowSearchPanel(false);
  };

  const getEventsByCategory = (category) => {
    const eventsToFilter = filteredEvents.length > 0 ? filteredEvents : events;
    return eventsToFilter.filter(event => event.category.toLowerCase() === category.toLowerCase());
  };

  const categories = ["Comedy", "Music", "Influencer", "Entertainment", "Sports", "Education"];
  const displayEvents = filteredEvents.length > 0 ? filteredEvents : events;
  const featuredEvent = displayEvents[featuredEventIndex];

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="home-page">
      <Navbar user={user} onLogout={onLogout} />
      
      {/* Location Search Toggle Button - Fixed Position */}
      <button
        onClick={() => setShowSearchPanel(!showSearchPanel)}
        className="fixed top-20 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all"
        data-testid="location-search-toggle"
      >
        <MapPin className="w-5 h-5" />
      </button>

      {/* Location Search Panel */}
      {showSearchPanel && (
        <div className="fixed top-32 right-4 z-50 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg p-4 w-80 shadow-xl" data-testid="location-search-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Search className="w-4 h-4 text-purple-400" />
              Find Events Near You
            </h3>
            <button onClick={() => setShowSearchPanel(false)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">City</label>
              <Input
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                placeholder="Enter city name"
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="search-city-input"
              />
            </div>
            
            <div>
              <label className="text-gray-400 text-xs mb-1 block">State</label>
              <select
                value={searchState}
                onChange={(e) => setSearchState(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
                data-testid="search-state-select"
              >
                <option value="">All States</option>
                {US_STATES.map(state => (
                  <option key={state.code} value={state.code}>{state.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                onClick={searchByLocation}
                disabled={isSearching}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="search-events-button"
              >
                {isSearching ? "Searching..." : "Search"}
              </Button>
              {(searchCity || searchState || filteredEvents.length > 0) && (
                <Button
                  onClick={clearSearch}
                  variant="outline"
                  className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800"
                  data-testid="clear-search-button"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Search Indicator */}
      {filteredEvents.length > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-purple-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-lg" data-testid="search-results-indicator">
          <MapPin className="w-4 h-4" />
          Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} 
          {searchCity && ` in ${searchCity}`}
          {searchState && `, ${searchState}`}
          <button onClick={clearSearch} className="ml-2 hover:bg-purple-700 rounded-full p-1">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      
      {/* Hero Section */}
      {featuredEvent && (
        <div className="relative h-[85vh] w-full" data-testid="hero-section">
          <div className="absolute inset-0 transition-opacity duration-1000">
            <img 
              src={featuredEvent.image_url} 
              alt={featuredEvent.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 via-40% to-black/30 to-70%"></div>
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 via-40% to-transparent"></div>
          </div>
          
          <div className="relative h-full flex items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="max-w-2xl animate-fadeIn">
              <h1 className="text-white text-5xl md:text-7xl font-black mb-4" data-testid="featured-event-title">
                {featuredEvent.title}
              </h1>
              <p className="text-gray-300 text-lg md:text-xl mb-6 line-clamp-3" data-testid="featured-event-description">
                {featuredEvent.description}
              </p>
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => navigate(`/event/${featuredEvent.id}`)}
                  className="bg-white hover:bg-gray-200 text-black font-bold text-lg px-8 py-6"
                  data-testid="featured-event-play-button"
                >
                  <Play className="mr-2 h-6 w-6 fill-current" />
                  Buy Tickets
                </Button>
                <Button 
                  onClick={() => navigate(`/event/${featuredEvent.id}`)}
                  className="bg-gray-600/80 hover:bg-gray-600 text-white font-bold text-lg px-8 py-6"
                  data-testid="featured-event-info-button"
                >
                  <Info className="mr-2 h-5 w-5" />
                  More Info
                </Button>
              </div>
            </div>
          </div>

          {/* Carousel Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {displayEvents.slice(0, 10).map((_, index) => (
              <button
                key={index}
                onClick={() => setFeaturedEventIndex(index)}
                className={`h-1 transition-all duration-300 ${
                  index === featuredEventIndex
                    ? "w-8 bg-blue-500"
                    : "w-6 bg-gray-500 hover:bg-gray-400"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Event Rows - Moved down with more spacing */}
      <div className="relative pt-12 pb-20">
        <EventRow title="Upcoming Events" events={events.slice(0, 10)} />
        {categories.map((category) => {
          const categoryEvents = getEventsByCategory(category);
          return categoryEvents.length > 0 ? (
            <EventRow key={category} title={category} events={categoryEvents} />
          ) : null;
        })}
      </div>
    </div>
  );
};

export default Home;