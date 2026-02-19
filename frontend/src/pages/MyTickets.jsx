import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { Ticket as TicketIcon, Calendar, Play, Clock, MapPin, CheckCircle, XCircle, Download } from "lucide-react";
import { toast } from "sonner";

const MyTickets = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);

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
      const eventPromises = eventIds.map(id => 
        axiosInstance.get(`/events/${id}`).catch(() => null)
      );
      const eventResponses = await Promise.all(eventPromises);
      
      const eventsMap = {};
      eventResponses.forEach(res => {
        if (res && res.data) {
          eventsMap[res.data.id] = res.data;
        }
      });
      setEvents(eventsMap);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  // Handle calendar download for mobile compatibility
  const handleAddToCalendar = async (ticketId, eventTitle) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/tickets/${ticketId}/calendar`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate calendar file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and click it
      const link = document.createElement('a');
      link.href = url;
      link.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Calendar file downloaded!");
    } catch (error) {
      console.error("Calendar download error:", error);
      toast.error("Failed to download calendar file");
    }
  };

  // Navigate to watch event
  const handleWatchEvent = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  // Get status badge for event
  const getStatusBadge = (event) => {
    if (!event) return null;
    
    switch (event.status) {
      case "live":
        return (
          <div className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            LIVE NOW
          </div>
        );
      case "completed":
        return (
          <div className="flex items-center gap-1 bg-gray-600 text-white px-3 py-1 rounded-full text-sm">
            <CheckCircle className="w-3 h-3" />
            Ended
          </div>
        );
      case "cancelled":
        return (
          <div className="flex items-center gap-1 bg-red-800 text-white px-3 py-1 rounded-full text-sm">
            <XCircle className="w-3 h-3" />
            Cancelled
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
            <Clock className="w-3 h-3" />
            Upcoming
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="my-tickets-page">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-20">
        <h1 className="text-white text-4xl md:text-5xl font-black mb-8" data-testid="tickets-title">My Tickets</h1>
        
        {tickets.length === 0 ? (
          <div className="text-center py-20" data-testid="no-tickets-message">
            <TicketIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-xl mb-4">You haven't purchased any tickets yet</p>
            <Button 
              onClick={() => navigate("/")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Browse Events
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => {
              const event = events[ticket.event_id];
              const isLive = event?.status === "live";
              const isUpcoming = event?.status === "upcoming";
              const isCancelled = event?.status === "cancelled";
              const isRefunded = ticket.refunded;
              
              return (
                <div 
                  key={ticket.id} 
                  className={`bg-gray-900/50 rounded-lg overflow-hidden transition-all ${
                    isLive 
                      ? "ring-2 ring-red-500 hover:ring-red-400" 
                      : isRefunded || isCancelled
                      ? "opacity-60"
                      : "hover:bg-gray-900/70 hover:ring-2 hover:ring-blue-500"
                  }`}
                  data-testid={`ticket-card-${ticket.id}`}
                >
                  <div className="aspect-[3/4] w-full relative">
                    <img 
                      src={event?.image_url || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400"} 
                      alt={event?.title || "Event"}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Ticket quantity badge */}
                    <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold" data-testid={`ticket-quantity-${ticket.id}`}>
                      x{ticket.quantity}
                    </div>
                    
                    {/* Status badge */}
                    <div className="absolute top-2 left-2">
                      {getStatusBadge(event)}
                    </div>
                    
                    {/* Refunded overlay */}
                    {isRefunded && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold">
                          REFUNDED
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-white text-xl font-bold mb-2" data-testid={`ticket-event-title-${ticket.id}`}>
                      {event?.title || "Event Unavailable"}
                    </h3>
                    
                    {event && (
                      <>
                        <div className="flex items-center gap-2 text-gray-300 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm" data-testid={`ticket-event-date-${ticket.id}`}>
                            {event.date} at {event.time}
                          </span>
                        </div>
                        
                        {event.venue && (
                          <div className="flex items-center gap-2 text-gray-400 mb-4">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm" data-testid={`ticket-event-venue-${ticket.id}`}>
                              {event.venue}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="border-t border-gray-700 pt-4 mb-4 flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Purchased</span>
                      <span className="text-white text-sm" data-testid={`ticket-purchase-date-${ticket.id}`}>
                        {new Date(ticket.purchase_date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* Amount paid */}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-400 text-sm">Amount Paid</span>
                      <span className={`font-bold ${isRefunded ? "text-yellow-500 line-through" : "text-green-400"}`}>
                        ${ticket.amount_paid?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    
                    {/* Action Buttons */}
                    {!isRefunded && !isCancelled && (
                      <div className="space-y-3">
                        {/* Watch/Connect Button - Primary action for live/upcoming events */}
                        {(isLive || isUpcoming) && (
                          <Button
                            onClick={() => handleWatchEvent(event.id)}
                            className={`w-full font-bold py-3 ${
                              isLive 
                                ? "bg-red-600 hover:bg-red-700 animate-pulse" 
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                            data-testid={`watch-event-${ticket.id}`}
                          >
                            <Play className="w-5 h-5 mr-2" />
                            {isLive ? "Watch Now" : "View Event"}
                          </Button>
                        )}
                        
                        {/* Add to Calendar Button - Works on mobile */}
                        {isUpcoming && (
                          <Button
                            onClick={() => handleAddToCalendar(ticket.id, event?.title || "Event")}
                            variant="outline"
                            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                            data-testid={`add-to-calendar-${ticket.id}`}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Add to Calendar
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Refund info */}
                    {isRefunded && ticket.refund_reason && (
                      <div className="text-yellow-500 text-sm text-center p-2 bg-yellow-500/10 rounded">
                        {ticket.refund_reason}
                      </div>
                    )}
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
