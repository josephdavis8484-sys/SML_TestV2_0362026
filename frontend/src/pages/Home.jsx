import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import EventRow from "@/components/EventRow";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { Play, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Home = ({ user, onLogout }) => {
  const [events, setEvents] = useState([]);
  const [featuredEventIndex, setFeaturedEventIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    // Auto-cycle through featured events every 5 seconds
    if (events.length > 0) {
      const interval = setInterval(() => {
        setFeaturedEventIndex((prevIndex) => (prevIndex + 1) % Math.min(events.length, 10));
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [events]);

  const fetchEvents = async () => {
    try {
      const response = await axiosInstance.get("/events");
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const getEventsByCategory = (category) => {
    return events.filter(event => event.category.toLowerCase() === category.toLowerCase());
  };

  const categories = ["Comedy", "Music", "Influencer", "Entertainment", "Sports"];
  const featuredEvent = events[featuredEventIndex];

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="home-page">
      <Navbar user={user} onLogout={onLogout} />
      
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
            {events.slice(0, 10).map((_, index) => (
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