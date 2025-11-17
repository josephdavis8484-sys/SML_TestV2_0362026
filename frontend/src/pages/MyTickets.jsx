import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { Ticket as TicketIcon, Calendar } from "lucide-react";

const MyTickets = ({ user, onLogout }) => {
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState({});

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await axiosInstance.get("/tickets");
      const ticketsData = response.data;
      setTickets(ticketsData);

      // Fetch event details for each ticket
      const eventIds = [...new Set(ticketsData.map(t => t.event_id))];
      const eventPromises = eventIds.map(id => axiosInstance.get(`/events/${id}`));
      const eventResponses = await Promise.all(eventPromises);
      
      const eventsMap = {};
      eventResponses.forEach(res => {
        eventsMap[res.data.id] = res.data;
      });
      setEvents(eventsMap);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="my-tickets-page">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-20">
        <h1 className="text-white text-4xl md:text-5xl font-black mb-8" data-testid="tickets-title">My Tickets</h1>
        
        {tickets.length === 0 ? (
          <div className="text-center py-20" data-testid="no-tickets-message">
            <TicketIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">You haven't purchased any tickets yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => {
              const event = events[ticket.event_id];
              if (!event) return null;
              
              return (
                <div key={ticket.id} className="bg-gray-900/50 rounded-lg overflow-hidden hover:bg-gray-900/70 hover:ring-2 hover:ring-blue-500 transition-all" data-testid={`ticket-card-${ticket.id}`}>
                  <div className="aspect-video w-full relative">
                    <img 
                      src={event.image_url} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold" data-testid={`ticket-quantity-${ticket.id}`}>
                      x{ticket.quantity}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-white text-xl font-bold mb-2" data-testid={`ticket-event-title-${ticket.id}`}>{event.title}</h3>
                    <div className="flex items-center gap-2 text-gray-300 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm" data-testid={`ticket-event-date-${ticket.id}`}>{event.date}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4" data-testid={`ticket-event-venue-${ticket.id}`}>{event.venue}</p>
                    <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Purchased</span>
                      <span className="text-white text-sm" data-testid={`ticket-purchase-date-${ticket.id}`}>
                        {new Date(ticket.purchase_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;