import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { Shield, Users, Calendar, Ticket, DollarSign, AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [liveMonitoring, setLiveMonitoring] = useState([]);
  const [bankInfo, setBankInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(() => {
      if (activeTab === "live") {
        fetchLiveMonitoring();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, eventsRes, ticketsRes, bankRes] = await Promise.all([
        axiosInstance.get("/admin/dashboard"),
        axiosInstance.get("/admin/users"),
        axiosInstance.get("/admin/events"),
        axiosInstance.get("/admin/tickets"),
        axiosInstance.get("/admin/bank-info")
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setEvents(eventsRes.data);
      setTickets(ticketsRes.data);
      setBankInfo(bankRes.data);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      if (error.response?.status === 403) {
        toast.error("Admin access required");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveMonitoring = async () => {
    try {
      const res = await axiosInstance.get("/admin/live-monitoring");
      setLiveMonitoring(res.data);
    } catch (error) {
      console.error("Error fetching live monitoring:", error);
    }
  };

  const handleBlockUser = async (userId, reason) => {
    if (!reason) {
      reason = prompt("Enter block reason:");
      if (!reason) return;
    }
    
    try {
      await axiosInstance.post(`/admin/users/${userId}/block?reason=${encodeURIComponent(reason)}`);
      toast.success("User blocked successfully");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to block user");
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await axiosInstance.post(`/admin/users/${userId}/unblock`);
      toast.success("User unblocked successfully");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to unblock user");
    }
  };

  const handleBlockEvent = async (eventId, reason) => {
    if (!reason) {
      reason = prompt("Enter block reason:");
      if (!reason) return;
    }
    
    try {
      await axiosInstance.post(`/admin/events/${eventId}/block?reason=${encodeURIComponent(reason)}`);
      toast.success("Event blocked successfully");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to block event");
    }
  };

  const handleRefund = async (ticketId) => {
    const reason = prompt("Enter refund reason:");
    if (!reason) return;
    
    try {
      const res = await axiosInstance.post(`/admin/refund/${ticketId}?reason=${encodeURIComponent(reason)}`);
      toast.success(`Refund processed: $${res.data.amount}`);
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to process refund");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white text-xl">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Admin Header */}
      <div className="bg-red-600 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-white" />
            <h1 className="text-white text-2xl font-black">ShowMeLive Admin Panel</h1>
          </div>
          <Button onClick={handleLogout} className="bg-red-800 hover:bg-red-900">
            Logout
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            {["overview", "users", "events", "tickets", "live", "bank"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 font-medium capitalize ${
                  activeTab === tab
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && stats && (
          <div className="space-y-6">
            <h2 className="text-white text-3xl font-bold">Platform Overview</h2>
            
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-6">
                <Users className="w-8 h-8 text-blue-500 mb-2" />
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-white text-3xl font-bold">{stats.users.total}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {stats.users.creators} creators, {stats.users.viewers} viewers
                </p>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-6">
                <Calendar className="w-8 h-8 text-green-500 mb-2" />
                <p className="text-gray-400 text-sm">Total Events</p>
                <p className="text-white text-3xl font-bold">{stats.events.total}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {stats.events.live} currently live
                </p>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-6">
                <Ticket className="w-8 h-8 text-purple-500 mb-2" />
                <p className="text-gray-400 text-sm">Tickets Sold</p>
                <p className="text-white text-3xl font-bold">{stats.tickets.total}</p>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-6">
                <DollarSign className="w-8 h-8 text-yellow-500 mb-2" />
                <p className="text-gray-400 text-sm">Platform Earnings</p>
                <p className="text-white text-3xl font-bold">
                  ${stats.revenue.platform_earnings.toFixed(2)}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Total revenue: ${stats.revenue.total.toFixed(2)}
                </p>
              </div>
            </div>

            {stats.users.blocked > 0 && (
              <div className="bg-red-600/10 border border-red-600 rounded-lg p-4">
                <AlertTriangle className="w-5 h-5 text-red-500 inline mr-2" />
                <span className="text-red-400">{stats.users.blocked} blocked users</span>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <h2 className="text-white text-3xl font-bold">User Management</h2>
            <div className="bg-gray-900/50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="text-left text-gray-300 p-4">Name</th>
                    <th className="text-left text-gray-300 p-4">Email</th>
                    <th className="text-left text-gray-300 p-4">Role</th>
                    <th className="text-left text-gray-300 p-4">Status</th>
                    <th className="text-left text-gray-300 p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role !== "admin").map((user) => (
                    <tr key={user.id} className="border-t border-gray-800">
                      <td className="text-white p-4">{user.name}</td>
                      <td className="text-gray-400 p-4">{user.email}</td>
                      <td className="text-gray-400 p-4 capitalize">{user.role}</td>
                      <td className="p-4">
                        {user.is_blocked ? (
                          <span className="text-red-500 text-sm">Blocked</span>
                        ) : (
                          <span className="text-green-500 text-sm">Active</span>
                        )}
                      </td>
                      <td className="p-4">
                        {user.is_blocked ? (
                          <Button
                            onClick={() => handleUnblockUser(user.id)}
                            className="bg-green-600 hover:bg-green-700 text-sm"
                          >
                            Unblock
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleBlockUser(user.id)}
                            className="bg-red-600 hover:bg-red-700 text-sm"
                          >
                            Block
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="space-y-4">
            <h2 className="text-white text-3xl font-bold">Event Management</h2>
            <div className="grid gap-4">
              {events.map((event) => (
                <div key={event.id} className="bg-gray-900/50 rounded-lg p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white text-xl font-bold mb-2">{event.title}</h3>
                      <p className="text-gray-400 text-sm mb-1">{event.date} at {event.time}</p>
                      <p className="text-gray-400 text-sm">Revenue: ${event.total_revenue?.toFixed(2) || "0.00"}</p>
                      {event.is_blocked && (
                        <p className="text-red-500 text-sm mt-2">⚠️ Blocked: {event.block_reason}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded text-sm ${
                        event.status === "live" ? "bg-red-600" : "bg-blue-600"
                      }`}>
                        {event.status}
                      </span>
                      {!event.is_blocked && (
                        <Button
                          onClick={() => handleBlockEvent(event.id)}
                          className="bg-red-600 hover:bg-red-700 text-sm"
                        >
                          Block
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === "tickets" && (
          <div className="space-y-4">
            <h2 className="text-white text-3xl font-bold">Ticket Management & Refunds</h2>
            <div className="bg-gray-900/50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="text-left text-gray-300 p-4">Event ID</th>
                    <th className="text-left text-gray-300 p-4">User ID</th>
                    <th className="text-left text-gray-300 p-4">Quantity</th>
                    <th className="text-left text-gray-300 p-4">Amount</th>
                    <th className="text-left text-gray-300 p-4">Status</th>
                    <th className="text-left text-gray-300 p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-t border-gray-800">
                      <td className="text-gray-400 p-4 text-sm">{ticket.event_id.substring(0, 8)}...</td>
                      <td className="text-gray-400 p-4 text-sm">{ticket.user_id.substring(0, 8)}...</td>
                      <td className="text-white p-4">{ticket.quantity}</td>
                      <td className="text-white p-4">${ticket.amount_paid?.toFixed(2) || "0.00"}</td>
                      <td className="p-4">
                        {ticket.refunded ? (
                          <span className="text-yellow-500 text-sm">Refunded</span>
                        ) : (
                          <span className="text-green-500 text-sm">Active</span>
                        )}
                      </td>
                      <td className="p-4">
                        {!ticket.refunded && (
                          <Button
                            onClick={() => handleRefund(ticket.id)}
                            className="bg-yellow-600 hover:bg-yellow-700 text-sm"
                          >
                            Refund
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Live Monitoring Tab */}
        {activeTab === "live" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-red-500 animate-pulse" />
              <h2 className="text-white text-3xl font-bold">Live Event Monitoring</h2>
            </div>
            
            {liveMonitoring.length === 0 ? (
              <div className="bg-gray-900/50 rounded-lg p-12 text-center">
                <p className="text-gray-400">No live events at the moment</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {liveMonitoring.map((item) => (
                  <div key={item.event.id} className="bg-gray-900/50 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <h3 className="text-white text-xl font-bold">LIVE: {item.event.title}</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Ticket Sales</p>
                        <p className="text-white text-2xl font-bold">{item.ticket_sales}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Active Cameras</p>
                        <p className="text-white text-2xl font-bold">{item.active_cameras}/{item.total_cameras}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Revenue</p>
                        <p className="text-white text-2xl font-bold">${item.event.total_revenue?.toFixed(2) || "0.00"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bank Info Tab */}
        {activeTab === "bank" && (
          <div className="space-y-4">
            <h2 className="text-white text-3xl font-bold">Platform Bank Account</h2>
            <div className="bg-gray-900/50 rounded-lg p-6">
              <p className="text-gray-400 mb-4">Configure platform bank account for receiving fees</p>
              {bankInfo && bankInfo.account_name ? (
                <div className="space-y-2 text-gray-300">
                  <p><strong>Account Name:</strong> {bankInfo.account_name}</p>
                  <p><strong>Bank:</strong> {bankInfo.bank_name}</p>
                  <p><strong>Last Updated:</strong> {new Date(bankInfo.updated_at).toLocaleDateString()}</p>
                </div>
              ) : (
                <p className="text-gray-500">No bank account configured yet</p>
              )}
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                Update Bank Info
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
