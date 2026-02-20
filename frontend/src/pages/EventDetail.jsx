import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, DollarSign, ArrowLeft, CreditCard, Ticket, MessageCircle, Shield, Share2 } from "lucide-react";
import { toast } from "sonner";
import LiveChat from "@/components/LiveChat";
import AntiPiracy from "@/components/AntiPiracy";
import LiveStreamViewer from "@/components/LiveStreamViewer";

const EMERGENT_AUTH_URL = "https://auth.emergentagent.com";
const APP_NAME = "ShowMeLive";

const EventDetail = ({ user, onLogout }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);

  useEffect(() => {
    fetchEvent();
    if (user) {
      checkUserTicket();
    }
  }, [id, user]);

  const fetchEvent = async () => {
    try {
      const response = await axiosInstance.get(`/events/${id}`);
      setEvent(response.data);
    } catch (error) {
      console.error("Error fetching event:", error);
      toast.error("Event not found");
      navigate("/");
    }
  };

  const checkUserTicket = async () => {
    try {
      const response = await axiosInstance.get("/tickets");
      const userTickets = response.data;
      const ticketForEvent = userTickets.find(t => t.event_id === id && !t.refunded);
      setHasTicket(!!ticketForEvent);
    } catch (error) {
      console.error("Error checking ticket:", error);
      setHasTicket(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      // Store event ID to return after auth
      sessionStorage.setItem("pending_purchase_event", id);
      sessionStorage.setItem("pending_role", "viewer");
      const redirectUrl = `${window.location.origin}/event/${id}`;
      window.location.href = `${EMERGENT_AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}&app_name=${encodeURIComponent(APP_NAME)}`;
      return;
    }

    setPurchasing(true);
    try {
      // Use Stripe checkout for payment
      const response = await axiosInstance.post("/payments/checkout/session", {
        payment_type: "ticket",
        event_id: id,
        quantity: quantity,
        origin_url: window.location.origin
      });
      
      // Redirect to Stripe checkout
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error initiating checkout:", error);
      toast.error("Failed to initiate payment. Please try again.");
      setPurchasing(false);
    }
  };

  // Quick purchase without Stripe (free events)
  const handleFreePurchase = async () => {
    if (!user) {
      sessionStorage.setItem("pending_purchase_event", id);
      sessionStorage.setItem("pending_role", "viewer");
      const redirectUrl = `${window.location.origin}/event/${id}`;
      window.location.href = `${EMERGENT_AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}&app_name=${encodeURIComponent(APP_NAME)}`;
      return;
    }

    setPurchasing(true);
    try {
      await axiosInstance.post("/tickets", {
        event_id: id,
        quantity: quantity
      });
      toast.success("Tickets claimed successfully!");
      navigate("/my-tickets");
    } catch (error) {
      console.error("Error claiming tickets:", error);
      toast.error("Failed to claim tickets");
    } finally {
      setPurchasing(false);
    }
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const isFreeEvent = event.price === 0;
  const totalPrice = (event.price * quantity).toFixed(2);

  // Check if event is live and user has a ticket
  const isLive = event.status === "live";
  const canWatchStream = isLive && user && hasTicket;

  return (
    <AntiPiracy enabled={isLive}>
      <div className="min-h-screen bg-[#0f0f0f]" data-testid="event-detail-page">
        <Navbar user={user} onLogout={onLogout} />
        
        <div className="pt-20">
          {/* Live Stream or Hero Image */}
          {isLive ? (
            <div className="relative h-[60vh] w-full bg-black">
              {canWatchStream ? (
                /* Actual LiveKit Video Stream for ticket holders */
                <LiveStreamViewer
                  eventId={id}
                  userId={user?.id}
                  userName={user?.name || user?.email}
                />
              ) : (
                /* Placeholder for users without tickets */
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-500 font-bold text-lg">LIVE NOW</span>
                    </div>
                    <img 
                      src={event.image_url} 
                      alt={event.title}
                      className="max-h-80 mx-auto rounded-lg opacity-80"
                      draggable="false"
                      onContextMenu={(e) => e.preventDefault()}
                    />
                    {!user ? (
                      <p className="text-yellow-400 mt-4 text-sm">
                        Sign in and purchase a ticket to watch this live event
                      </p>
                    ) : !hasTicket ? (
                      <p className="text-yellow-400 mt-4 text-sm">
                        Purchase a ticket below to watch this live stream
                      </p>
                    ) : null}
                    <p className="text-gray-400 mt-2 text-sm flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" />
                      Content protected • Recording disabled
                    </p>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent pointer-events-none"></div>
              
              <button
                onClick={() => navigate(-1)}
                className="absolute top-8 left-8 bg-black/60 hover:bg-blue-600/80 text-white p-3 rounded-full transition-colors z-10"
                data-testid="back-button"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <div className="relative h-[60vh] w-full">
              <img 
                src={event.image_url} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-black/50 to-transparent"></div>
              
              <button
                onClick={() => navigate(-1)}
                className="absolute top-8 left-8 bg-black/60 hover:bg-blue-600/80 text-white p-3 rounded-full transition-colors"
                data-testid="back-button"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>
          )}

        {/* Event Details */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h1 className="text-white text-4xl md:text-6xl font-black mb-6" data-testid="event-detail-title">{event.title}</h1>
              
              <div className="flex flex-wrap gap-6 mb-8">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-5 h-5" />
                  <span data-testid="event-date">
                    {event.date}
                    {event.start_time && event.end_time ? (
                      <span className="ml-2">
                        {event.start_time} - {event.end_time}
                      </span>
                    ) : event.time ? (
                      <span className="ml-2">at {event.time}</span>
                    ) : null}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="w-5 h-5" />
                  <span data-testid="event-venue">{event.venue}</span>
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-6 mb-6">
                <h2 className="text-white text-2xl font-bold mb-4">About</h2>
                <p className="text-gray-300 text-lg leading-relaxed" data-testid="event-description">{event.description}</p>
              </div>

              {/* Interaction Features Badge */}
              {(event.chat_enabled || event.reactions_enabled) && (
                <div className="flex gap-2 mb-6">
                  {event.chat_enabled && (
                    <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-600 rounded-lg px-3 py-2">
                      <MessageCircle className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400 text-sm font-medium">
                        {event.chat_mode === "questions_only" ? "Live Q&A" : "Live Chat"}
                      </span>
                    </div>
                  )}
                  {event.reactions_enabled && (
                    <div className="inline-flex items-center gap-2 bg-pink-600/20 border border-pink-600 rounded-lg px-3 py-2">
                      <span className="text-lg">❤️</span>
                      <span className="text-pink-400 text-sm font-medium">Live Reactions</span>
                    </div>
                  )}
                </div>
              )}

              <div className="inline-block bg-blue-600/20 border border-blue-600 rounded-lg px-4 py-2">
                <span className="text-blue-400 font-medium">{event.category}</span>
              </div>

              {/* Live Chat for Live Events */}
              {event.status === "live" && (event.chat_enabled || event.reactions_enabled) && (
                <div className="mt-6">
                  <LiveChat
                    eventId={event.id}
                    user={user}
                    chatEnabled={event.chat_enabled}
                    reactionsEnabled={event.reactions_enabled}
                    chatMode={event.chat_mode}
                  />
                </div>
              )}
            </div>

            {/* Purchase Card */}
            <div className="md:col-span-1">
              <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 sticky top-24" data-testid="purchase-card">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-green-500" />
                    <span className="text-white text-3xl font-bold" data-testid="event-price">
                      {isFreeEvent ? "FREE" : `$${event.price}`}
                    </span>
                  </div>
                  {!isFreeEvent && <span className="text-gray-400">per ticket</span>}
                </div>

                <div className="mb-6">
                  <label className="text-gray-300 text-sm font-medium mb-2 block">Quantity</label>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="bg-gray-800 hover:bg-blue-600 text-white px-4 py-2 transition-colors"
                      data-testid="decrease-quantity"
                    >
                      -
                    </Button>
                    <span className="text-white text-xl font-bold w-12 text-center" data-testid="ticket-quantity">{quantity}</span>
                    <Button
                      onClick={() => setQuantity(quantity + 1)}
                      className="bg-gray-800 hover:bg-blue-600 text-white px-4 py-2 transition-colors"
                      data-testid="increase-quantity"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4 mb-6">
                  <div className="flex items-center justify-between text-lg">
                    <span className="text-gray-300">Total</span>
                    <span className="text-white font-bold text-2xl" data-testid="total-price">
                      {isFreeEvent ? "FREE" : `$${totalPrice}`}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={isFreeEvent ? handleFreePurchase : handlePurchase}
                  disabled={purchasing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-6 transition-colors flex items-center justify-center gap-2"
                  data-testid="purchase-button"
                >
                  {purchasing ? (
                    "Processing..."
                  ) : user ? (
                    <>
                      {isFreeEvent ? (
                        <>
                          <Ticket className="w-5 h-5" />
                          Claim Free Tickets
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          Pay ${totalPrice}
                        </>
                      )}
                    </>
                  ) : (
                    "Sign in to Purchase"
                  )}
                </Button>
                
                {!isFreeEvent && (
                  <p className="text-gray-500 text-xs text-center mt-3">
                    Secure payment powered by Stripe
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </AntiPiracy>
  );
};

export default EventDetail;