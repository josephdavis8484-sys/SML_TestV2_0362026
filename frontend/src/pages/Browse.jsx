import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Browse = ({ user, onLogout }) => {
  const [events, setEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axiosInstance.get("/events");
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const categories = ["All", "Comedy", "Music", "Influencer", "Entertainment", "Sports"];

  const filteredEvents = selectedCategory === "All" 
    ? events 
    : events.filter(event => event.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="browse-page">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-20">
        <h1 className="text-white text-4xl md:text-5xl font-black mb-8" data-testid="browse-title">Browse Events</h1>
        
        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 mb-12" data-testid="category-filter">
          {categories.map((category) => (
            <Button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`${
                selectedCategory === category
                  ? "bg-white text-black hover:bg-gray-200"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              } font-medium px-6 py-2`}
              data-testid={`category-filter-${category.toLowerCase()}`}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" data-testid="events-grid">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="group cursor-pointer"
              onClick={() => navigate(`/event/${event.id}`)}
              data-testid={`browse-event-card-${event.id}`}
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Button className="bg-white text-black hover:bg-gray-200 font-bold" data-testid={`view-event-${event.id}`}>
                    View Details
                  </Button>
                </div>
              </div>
              <h3 className="text-white font-semibold text-sm mb-1" data-testid={`browse-event-title-${event.id}`}>{event.title}</h3>
              <p className="text-gray-400 text-xs" data-testid={`browse-event-category-${event.id}`}>{event.category}</p>
            </div>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-20" data-testid="no-events-message">
            <p className="text-gray-400 text-xl">No events found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;