import React, { useRef } from "react";
import EventCard from "@/components/EventCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

const EventRow = ({ title, events }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!events || events.length === 0) return null;

  return (
    <div className="mb-8 group/row" data-testid={`event-row-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h2 className="text-white text-2xl font-bold mb-4 px-4 sm:px-6 lg:px-8" data-testid={`category-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>{title}</h2>
      
      <div className="relative group/scroll">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover/scroll:opacity-100 transition-opacity ml-2"
          data-testid={`scroll-left-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8 pb-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
        
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover/scroll:opacity-100 transition-opacity mr-2"
          data-testid={`scroll-right-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default EventRow;