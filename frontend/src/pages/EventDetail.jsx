import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, DollarSign, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const EMERGENT_AUTH_URL = "https://auth.emergentagent.com";

const EventDetail = ({ user, onLogout }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

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

  const handlePurchase = async () => {
    if (!user) {
      const redirectUrl = `${window.location.origin}/event/${id}`;
      window.location.href = `${EMERGENT_AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;
      return;
    }

    setPurchasing(true);
    try {
      await axiosInstance.post("/tickets", {
        event_id: id,
        quantity: quantity
      });
      toast.success("Tickets purchased successfully!");
      navigate("/my-tickets");
    } catch (error) {
      console.error("Error purchasing tickets:", error);
      toast.error("Failed to purchase tickets");
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

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="event-detail-page">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="pt-20">
        {/* Hero Image */}
        <div className="relative h-[60vh] w-full">
          <img 
            src={event.image_url} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-black/50 to-transparent"></div>
          
          <button
            onClick={() => navigate(-1)}
            className="absolute top-8 left-8 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full"
            data-testid="back-button"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Event Details */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h1 className="text-white text-4xl md:text-6xl font-black mb-6" data-testid="event-detail-title">{event.title}</h1>
              
              <div className="flex flex-wrap gap-6 mb-8">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-5 h-5" />
                  <span data-testid="event-date">{event.date}</span>
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

              <div className="inline-block bg-red-600/20 border border-red-600 rounded-lg px-4 py-2">
                <span className="text-red-500 font-medium">{event.category}</span>
              </div>
            </div>

            {/* Purchase Card */}
            <div className="md:col-span-1">
              <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 sticky top-24" data-testid="purchase-card">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-green-500" />
                    <span className="text-white text-3xl font-bold" data-testid="event-price">${event.price}</span>
                  </div>
                  <span className="text-gray-400">per ticket</span>
                </div>

                <div className="mb-6">
                  <label className="text-gray-300 text-sm font-medium mb-2 block">Quantity</label>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2"
                      data-testid="decrease-quantity"
                    >
                      -
                    </Button>
                    <span className="text-white text-xl font-bold w-12 text-center" data-testid="ticket-quantity">{quantity}</span>
                    <Button
                      onClick={() => setQuantity(quantity + 1)}
                      className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2"
                      data-testid="increase-quantity"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4 mb-6">
                  <div className="flex items-center justify-between text-lg">
                    <span className="text-gray-300">Total</span>
                    <span className="text-white font-bold text-2xl" data-testid="total-price">${(event.price * quantity).toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-6"
                  data-testid="purchase-button"
                >
                  {purchasing ? "Processing..." : user ? "Purchase Tickets" : "Sign in to Purchase"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;