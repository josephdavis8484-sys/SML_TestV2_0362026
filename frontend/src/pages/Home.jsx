import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import EventRow from "@/components/EventRow";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { Play, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Home = ({ user, onLogout }) => {
  const [events, setEvents] = useState([]);
  const [featuredEvent, setFeaturedEvent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axiosInstance.get("/events");
      setEvents(response.data);
      if (response.data.length > 0) {
        setFeaturedEvent(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const getEventsByCategory = (category) => {
    return events.filter(event => event.category.toLowerCase() === category.toLowerCase());
  };

  const categories = ["Comedy", "Music", "Influencer", "Entertainment", "Sports"];

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="home-page">
      <Navbar user={user} onLogout={onLogout} />
      
      {/* Hero Section */}
      {featuredEvent && (
        <div className="relative h-[80vh] w-full" data-testid="hero-section">
          <div className="absolute inset-0">
            <img 
              src={featuredEvent.image_url} 
              alt={featuredEvent.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0f0f0f] to-transparent"></div>
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
        </div>
      )}

      {/* Event Rows */}
      <div className="relative -mt-32 z-10 pb-20">
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