import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, DollarSign, Users, Video } from "lucide-react";
import { toast } from "sonner";

const CreatorDashboard = ({ user, onLogout }) => {
  const [events, setEvents] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, earningsRes] = await Promise.all([
        axiosInstance.get("/events/creator/my-events"),
        axiosInstance.get("/creator/earnings")
      ]);
      setEvents(eventsRes.data);
      setEarnings(earningsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="creator-dashboard">
      <Navbar user={user} onLogout={onLogout} isCreator={true} />
      
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-20">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-white text-4xl md:text-5xl font-black" data-testid="dashboard-title">Creator Dashboard</h1>
          <Button
            onClick={() => navigate("/creator/create-event")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 flex items-center gap-2"
            data-testid="create-event-button"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </Button>
        </div>

        {/* Earnings Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          <div className="bg-gray-900/50 rounded-lg p-6" data-testid="total-revenue-card">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="text-gray-400 text-sm">Total Revenue</span>
            </div>
            <p className="text-white text-3xl font-bold">${earnings?.total_revenue?.toFixed(2) || "0.00"}</p>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-6" data-testid="creator-earnings-card">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              <span className="text-gray-400 text-sm">Your Earnings (80%)</span>
            </div>
            <p className="text-white text-3xl font-bold">${earnings?.creator_earnings?.toFixed(2) || "0.00"}</p>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-6" data-testid="pending-payout-card">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              <span className="text-gray-400 text-sm">Pending Payout</span>
            </div>
            <p className="text-white text-3xl font-bold">${earnings?.pending_payout?.toFixed(2) || "0.00"}</p>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-6" data-testid="total-events-card">
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-5 h-5 text-purple-500" />
              <span className="text-gray-400 text-sm">Total Events</span>
            </div>
            <p className="text-white text-3xl font-bold">{events.length}</p>
          </div>
        </div>

        {/* Events List */}
        <div>
          <h2 className="text-white text-2xl font-bold mb-6">Your Events</h2>
          
          {events.length === 0 ? (
            <div className="text-center py-20" data-testid="no-events-message">
              <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-xl mb-4">You haven't created any events yet</p>
              <Button
                onClick={() => navigate("/creator/create-event")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Create Your First Event
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="events-grid">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-gray-900/50 rounded-lg overflow-hidden hover:bg-gray-900/70 transition-all"
                  data-testid={`event-card-${event.id}`}
                >
                  <div className="aspect-[3/4] w-full relative">
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {event.status}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-white text-xl font-bold mb-2">{event.title}</h3>
                    <div className="flex items-center gap-2 text-gray-300 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{event.date} at {event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300 mb-4">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Revenue: ${event.total_revenue?.toFixed(2) || "0.00"}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigate(`/control-panel/${event.id}`)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                        data-testid={`manage-button-${event.id}`}
                      >
                        Manage Stream
                      </Button>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(event.share_link);
                          toast.success("Link copied!");
                        }}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm"
                        data-testid={`share-button-${event.id}`}
                      >
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;