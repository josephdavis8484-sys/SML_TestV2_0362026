import React from "react";
import { useNavigate } from "react-router-dom";

const EventCard = ({ event }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="group relative cursor-pointer flex-shrink-0 w-64 h-36 rounded-lg overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-blue-500"
      onClick={() => navigate(`/event/${event.id}`)}
      data-testid={`event-card-${event.id}`}
    >
      <img 
        src={event.image_url} 
        alt={event.title}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-lg mb-1" data-testid={`event-title-${event.id}`}>{event.title}</h3>
          <p className="text-blue-400 text-sm" data-testid={`event-category-${event.id}`}>{event.category}</p>
        </div>
      </div>
    </div>
  );
};

export default EventCard;