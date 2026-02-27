import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { 
  Ticket as TicketIcon, 
  Calendar, 
  ArrowRight, 
  Clock, 
  MapPin, 
  CheckCircle, 
  XCircle,
  Share2,
  X,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

// Share Modal Component
const ShareModal = ({ isOpen, onClose, eventTitle, eventUrl }) => {
  if (!isOpen) return null;

  const shareLinks = [
    {
      name: "X (Twitter)",
      icon: "𝕏",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${eventTitle} on ShowMeLive!`)}&url=${encodeURIComponent(eventUrl)}`
    },
    {
      name: "Facebook",
      icon: "f",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`
    },
    {
      name: "WhatsApp",
      icon: "📱",
      url: `https://wa.me/?text=${encodeURIComponent(`Check out ${eventTitle}! ${eventUrl}`)}`
    }
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-xl font-bold">Share This Show</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-3">
          {shareLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors"
            >
              <span className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-lg">
                {link.icon}
              </span>
              <span>{link.name}</span>
            </a>
          ))}
          
          <button
            onClick={copyLink}
            className="flex items-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors"
          >
            <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              🔗
            </span>
            <span>Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const MyTickets = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [shareModal, setShareModal] = useState({ isOpen: false, eventTitle: "", eventUrl: "" });

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

  const handleDeleteTicket = async (ticketId, eventTitle, eventStatus) => {
    if (eventStatus === "live") {
      toast.error("Cannot delete ticket for a live event");
      return;
    }
    
    const confirmed = window.confirm(
      `Are you sure you want to delete your ticket for "${eventTitle}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await axiosInstance.delete(`/tickets/${ticketId}`);
      toast.success("Ticket deleted successfully");
      fetchTickets(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete ticket");
    }
  };

  // Navigate to watch event
  const handleViewEvent = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  // Share event
  const handleShare = (event) => {
    const eventUrl = `${window.location.origin}/event/${event.id}`;
    setShareModal({
      isOpen: true,
      eventTitle: event.title,
      eventUrl: eventUrl
    });
  };

  // Get status badge for event
  const getStatusBadge = (event) => {
    if (!event) return null;
    
    switch (event.status) {
      case "live":
        return (
          <div className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-bold">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            LIVE NOW
          </div>
        );
      case "completed":
        return (
          <div className="flex items-center gap-1.5 bg-gray-600 text-white px-3 py-1.5 rounded-full text-sm font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            Ended
          </div>
        );
      case "cancelled":
        return (
          <div className="flex items-center gap-1.5 bg-red-800 text-white px-3 py-1.5 rounded-full text-sm font-medium">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-full text-sm font-medium">
            <Clock className="w-3.5 h-3.5" />
            Upcoming
          </div>
        );
    }
  };

  // Format date for display
  const formatEventDate = (event) => {
    if (!event) return "";
    
    let dateStr = event.date;
    if (event.start_time) {
      dateStr += ` at ${event.start_time}`;
    } else if (event.time) {
      dateStr += ` at ${event.time}`;
    }
    return dateStr;
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
      
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto pb-20">
        <h1 className="text-white text-3xl md:text-4xl font-black mb-8 text-center" data-testid="tickets-title">
          My Tickets
        </h1>
        
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
          <div className="space-y-6">
            {tickets.map((ticket) => {
              const event = events[ticket.event_id];
              const isLive = event?.status === "live";
              const isCancelled = event?.status === "cancelled";
              const isRefunded = ticket.refunded;
              
              // Check if event date has passed
              let isPast = false;
              if (event?.date) {
                const eventDate = new Date(event.date);
                isPast = eventDate < new Date();
              }
              
              return (
                <div 
                  key={ticket.id} 
                  className={`bg-gray-900 rounded-2xl overflow-hidden border-2 ${
                    isLive 
                      ? "border-red-500" 
                      : isRefunded || isCancelled
                      ? "border-gray-700 opacity-70"
                      : "border-blue-600"
                  }`}
                  data-testid={`ticket-card-${ticket.id}`}
                >
                  {/* Event Image with Badges */}
                  <div className="relative">
                    <img 
                      src={event?.image_url || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400"} 
                      alt={event?.title || "Event"}
                      className="w-full aspect-[4/3] object-cover"
                    />
                    
                    {/* Status badge - Top Left */}
                    <div className="absolute top-3 left-3">
                      {getStatusBadge(event)}
                    </div>
                    
                    {/* Ticket quantity badge - Top Right */}
                    <div 
                      className="absolute top-3 right-3 bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      data-testid={`ticket-quantity-${ticket.id}`}
                    >
                      x{ticket.quantity}
                    </div>
                    
                    {/* Refunded overlay */}
                    {isRefunded && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-bold text-lg">
                          REFUNDED
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Event Details */}
                  <div className="p-5">
                    <h3 className="text-white text-xl font-bold mb-3" data-testid={`ticket-event-title-${ticket.id}`}>
                      {event?.title || "Event Unavailable"}
                    </h3>
                    
                    {event && (
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm" data-testid={`ticket-event-date-${ticket.id}`}>
                            {formatEventDate(event)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-300">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm" data-testid={`ticket-event-venue-${ticket.id}`}>
                            {event.venue || "Online"}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Purchase Info */}
                    <div className="space-y-2 py-3 border-t border-gray-800">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Purchased</span>
                        <span className="text-white text-sm" data-testid={`ticket-purchase-date-${ticket.id}`}>
                          {new Date(ticket.purchase_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Amount Paid</span>
                        <span className={`font-bold text-lg ${isRefunded ? "text-yellow-500 line-through" : "text-green-400"}`}>
                          ${ticket.amount_paid?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    {!isRefunded && !isCancelled && (
                      <div className="space-y-3 pt-3">
                        {/* View Event Button - Green */}
                        <Button
                          onClick={() => handleViewEvent(event?.id)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 text-base rounded-lg"
                          data-testid={`view-event-${ticket.id}`}
                        >
                          <ArrowRight className="w-5 h-5 mr-2" />
                          View Event
                        </Button>
                        
                        {/* Add to Calendar Button - Blue */}
                        <Button
                          onClick={() => handleAddToCalendar(ticket.id, event?.title || "Event")}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 text-base rounded-lg"
                          data-testid={`add-to-calendar-${ticket.id}`}
                        >
                          <Calendar className="w-5 h-5 mr-2" />
                          Add to Calendar
                        </Button>
                        
                        {/* Share This Show Button - Outlined */}
                        <Button
                          onClick={() => handleShare(event)}
                          variant="outline"
                          className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 font-medium py-4 text-base rounded-lg"
                          data-testid={`share-event-${ticket.id}`}
                        >
                          <Share2 className="w-5 h-5 mr-2" />
                          Share This Show
                        </Button>
                        
                        {/* Delete Ticket Button - Available for upcoming, completed, or past events */}
                        {(event?.status === "upcoming" || event?.status === "completed" || isPast) && (
                          <Button
                            onClick={() => handleDeleteTicket(ticket.id, event?.title || "Event", event?.status)}
                            variant="outline"
                            className="w-full border-red-600/50 text-red-400 hover:bg-red-600/20 font-medium py-4 text-base rounded-lg"
                            data-testid={`delete-ticket-${ticket.id}`}
                          >
                            <Trash2 className="w-5 h-5 mr-2" />
                            Delete Ticket
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Refund info */}
                    {isRefunded && ticket.refund_reason && (
                      <div className="text-yellow-500 text-sm text-center p-3 bg-yellow-500/10 rounded-lg mt-3">
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

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ ...shareModal, isOpen: false })}
        eventTitle={shareModal.eventTitle}
        eventUrl={shareModal.eventUrl}
      />
    </div>
  );
};

export default MyTickets;
