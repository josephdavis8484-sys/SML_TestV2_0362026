import React from "react";
import { useNavigate } from "react-router-dom";

const EventCard = ({ event }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="group relative cursor-pointer flex-shrink-0 w-48 h-72 rounded-lg overflow-hidden transition-all duration-300 hover:scale-105"
      style={{
        boxShadow: '0 0 0 rgba(59, 130, 246, 0)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 0 5px rgba(59, 130, 246, 0.8), 0 0 10px rgba(59, 130, 246, 0.5), 0 0 15px rgba(59, 130, 246, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 rgba(59, 130, 246, 0)';
      }}
      onClick={() => navigate(`/event/${event.id}`)}
      data-testid={`event-card-${event.id}`}
    >
      <img 
        src={event.image_url} 
        alt={event.title}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 via-50% to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-lg mb-1" data-testid={`event-title-${event.id}`}>{event.title}</h3>
          <p className="text-blue-400 text-sm" data-testid={`event-category-${event.id}`}>{event.category}</p>
        </div>
      </div>
    </div>
  );
};

export default EventCard;