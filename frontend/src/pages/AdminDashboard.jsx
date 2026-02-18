import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Users, Calendar, Ticket, DollarSign, AlertTriangle, Activity, Tag, Plus, Trash2, Edit, Check, X } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create admin-specific axios instance that uses the admin token
const getAdminAxios = () => {
  const token = localStorage.getItem("admin_session");
  return axios.create({
    baseURL: API,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [liveMonitoring, setLiveMonitoring] = useState([]);
  const [bankInfo, setBankInfo] = useState(null);
  const [promoCodes, setPromoCodes] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    applies_to: "pro_mode",
    max_uses: "",
    start_date: "",
    expiration_date: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem("admin_session");
    if (!token) {
      navigate("/admin/login");
      return;
    }
    
    fetchAdminData();
    const interval = setInterval(() => {
      if (activeTab === "live") {
        fetchLiveMonitoring();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, navigate]);

  const fetchAdminData = async () => {
    const adminAxios = getAdminAxios();
    try {
      const [statsRes, usersRes, eventsRes, ticketsRes, bankRes, promoRes] = await Promise.all([
        adminAxios.get("/admin/dashboard"),
        adminAxios.get("/admin/users"),
        adminAxios.get("/admin/events"),
        adminAxios.get("/admin/tickets"),
        adminAxios.get("/admin/bank-info"),
        adminAxios.get("/admin/promo-codes")
      ]);
      
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setEvents(eventsRes.data);
      setTickets(ticketsRes.data);
      setBankInfo(bankRes.data);
      setPromoCodes(promoRes.data);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        toast.error("Admin access required");
        localStorage.removeItem("admin_session");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveMonitoring = async () => {
    const adminAxios = getAdminAxios();
    try {
      const res = await adminAxios.get("/admin/live-monitoring");
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
    
    const adminAxios = getAdminAxios();
    try {
      await adminAxios.post(`/admin/users/${userId}/block?reason=${encodeURIComponent(reason)}`);
      toast.success("User blocked successfully");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to block user");
    }
  };

  const handleUnblockUser = async (userId) => {
    const adminAxios = getAdminAxios();
    try {
      await adminAxios.post(`/admin/users/${userId}/unblock`);
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
    
    const adminAxios = getAdminAxios();
    try {
      await adminAxios.post(`/admin/events/${eventId}/block?reason=${encodeURIComponent(reason)}`);
      toast.success("Event blocked successfully");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to block event");
    }
  };

  const handleRefund = async (ticketId) => {
    const reason = prompt("Enter refund reason:");
    if (!reason) return;
    
    const adminAxios = getAdminAxios();
    try {
      const res = await adminAxios.post(`/admin/refund/${ticketId}?reason=${encodeURIComponent(reason)}`);
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

  // Promo Code Functions
  const resetPromoForm = () => {
    setPromoForm({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      applies_to: "pro_mode",
      max_uses: "",
      start_date: "",
      expiration_date: ""
    });
    setEditingPromo(null);
    setShowPromoForm(false);
  };

  const handleCreatePromoCode = async () => {
    if (!promoForm.code || !promoForm.discount_value) {
      toast.error("Code and discount value are required");
      return;
    }

    const adminAxios = getAdminAxios();
    try {
      const data = {
        ...promoForm,
        discount_value: parseFloat(promoForm.discount_value),
        max_uses: promoForm.max_uses ? parseInt(promoForm.max_uses) : null,
        start_date: promoForm.start_date || null,
        expiration_date: promoForm.expiration_date || null
      };

      await adminAxios.post("/admin/promo-codes", data);
      toast.success("Promo code created successfully");
      resetPromoForm();
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create promo code");
    }
  };

  const handleUpdatePromoCode = async () => {
    if (!editingPromo) return;

    const adminAxios = getAdminAxios();
    try {
      const data = {
        description: promoForm.description,
        discount_type: promoForm.discount_type,
        discount_value: parseFloat(promoForm.discount_value),
        max_uses: promoForm.max_uses ? parseInt(promoForm.max_uses) : null,
        start_date: promoForm.start_date || null,
        expiration_date: promoForm.expiration_date || null,
        is_active: editingPromo.is_active
      };

      await adminAxios.put(`/admin/promo-codes/${editingPromo.id}`, data);
      toast.success("Promo code updated successfully");
      resetPromoForm();
      fetchAdminData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update promo code");
    }
  };

  const handleDeletePromoCode = async (promoId) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;

    const adminAxios = getAdminAxios();
    try {
      await adminAxios.delete(`/admin/promo-codes/${promoId}`);
      toast.success("Promo code deleted");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to delete promo code");
    }
  };

  const handleTogglePromoActive = async (promo) => {
    const adminAxios = getAdminAxios();
    try {
      await adminAxios.put(`/admin/promo-codes/${promo.id}`, {
        is_active: !promo.is_active
      });
      toast.success(promo.is_active ? "Promo code deactivated" : "Promo code activated");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to update promo code");
    }
  };

  const startEditPromo = (promo) => {
    setEditingPromo(promo);
    setPromoForm({
      code: promo.code,
      description: promo.description || "",
      discount_type: promo.discount_type,
      discount_value: promo.discount_value.toString(),
      applies_to: promo.applies_to,
      max_uses: promo.max_uses?.toString() || "",
      start_date: promo.start_date?.split("T")[0] || "",
      expiration_date: promo.expiration_date?.split("T")[0] || ""
    });
    setShowPromoForm(true);
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
          <div className="flex gap-6 overflow-x-auto">
            {["overview", "users", "events", "tickets", "live", "promos", "bank"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 font-medium capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-white"
                }`}
                data-testid={`admin-tab-${tab}`}
              >
                {tab === "promos" ? "Promo Codes" : tab}
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

        {/* Promo Codes Tab */}
        {activeTab === "promos" && (
          <div className="space-y-6" data-testid="promo-codes-tab">
            <div className="flex justify-between items-center">
              <h2 className="text-white text-3xl font-bold">Promo Codes</h2>
              <Button
                onClick={() => {
                  resetPromoForm();
                  setShowPromoForm(true);
                }}
                className="bg-green-600 hover:bg-green-700"
                data-testid="create-promo-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Promo Code
              </Button>
            </div>

            {/* Create/Edit Form */}
            {showPromoForm && (
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-white text-xl font-bold mb-4">
                  {editingPromo ? "Edit Promo Code" : "Create New Promo Code"}
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-300 text-sm block mb-1">Code *</label>
                    <Input
                      value={promoForm.code}
                      onChange={(e) => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})}
                      placeholder="e.g., LAUNCH50"
                      className="bg-gray-800 border-gray-700 text-white uppercase"
                      disabled={!!editingPromo}
                      data-testid="promo-code-input"
                    />
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm block mb-1">Description</label>
                    <Input
                      value={promoForm.description}
                      onChange={(e) => setPromoForm({...promoForm, description: e.target.value})}
                      placeholder="Launch discount"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm block mb-1">Discount Type</label>
                    <select
                      value={promoForm.discount_type}
                      onChange={(e) => setPromoForm({...promoForm, discount_type: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm block mb-1">Discount Value *</label>
                    <Input
                      type="number"
                      value={promoForm.discount_value}
                      onChange={(e) => setPromoForm({...promoForm, discount_value: e.target.value})}
                      placeholder={promoForm.discount_type === "percentage" ? "50" : "500"}
                      className="bg-gray-800 border-gray-700 text-white"
                      data-testid="promo-discount-input"
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      {promoForm.discount_type === "percentage" ? "Enter percentage (0-100)" : "Enter dollar amount"}
                    </p>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm block mb-1">Applies To</label>
                    <select
                      value={promoForm.applies_to}
                      onChange={(e) => setPromoForm({...promoForm, applies_to: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2"
                    >
                      <option value="pro_mode">Pro Mode Only</option>
                      <option value="ticket">Tickets Only</option>
                      <option value="all">All Purchases</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm block mb-1">Max Uses</label>
                    <Input
                      type="number"
                      value={promoForm.max_uses}
                      onChange={(e) => setPromoForm({...promoForm, max_uses: e.target.value})}
                      placeholder="Leave empty for unlimited"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm block mb-1">Start Date</label>
                    <Input
                      type="date"
                      value={promoForm.start_date}
                      onChange={(e) => setPromoForm({...promoForm, start_date: e.target.value})}
                      className="bg-gray-800 border-gray-700 text-white"
                      data-testid="promo-start-date"
                    />
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm block mb-1">Expiration Date</label>
                    <Input
                      type="date"
                      value={promoForm.expiration_date}
                      onChange={(e) => setPromoForm({...promoForm, expiration_date: e.target.value})}
                      className="bg-gray-800 border-gray-700 text-white"
                      data-testid="promo-expiration-date"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={editingPromo ? handleUpdatePromoCode : handleCreatePromoCode}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="save-promo-button"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {editingPromo ? "Update" : "Create"} Promo Code
                  </Button>
                  <Button
                    onClick={resetPromoForm}
                    variant="outline"
                    className="border-gray-600 text-gray-300"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Promo Codes List */}
            <div className="bg-gray-900/50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="text-left text-gray-300 px-4 py-3 text-sm">Code</th>
                    <th className="text-left text-gray-300 px-4 py-3 text-sm">Discount</th>
                    <th className="text-left text-gray-300 px-4 py-3 text-sm">Applies To</th>
                    <th className="text-left text-gray-300 px-4 py-3 text-sm">Uses</th>
                    <th className="text-left text-gray-300 px-4 py-3 text-sm">Valid Period</th>
                    <th className="text-left text-gray-300 px-4 py-3 text-sm">Status</th>
                    <th className="text-left text-gray-300 px-4 py-3 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promoCodes.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-gray-500">
                        No promo codes yet. Create your first one!
                      </td>
                    </tr>
                  ) : (
                    promoCodes.map((promo) => {
                      const now = new Date();
                      const startDate = promo.start_date ? new Date(promo.start_date) : null;
                      const expirationDate = promo.expiration_date ? new Date(promo.expiration_date) : null;
                      const isExpired = expirationDate && now > expirationDate;
                      const isNotStarted = startDate && now < startDate;
                      const isMaxUsesReached = promo.max_uses && promo.current_uses >= promo.max_uses;

                      return (
                        <tr key={promo.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-green-400" />
                              <span className="text-white font-mono font-bold">{promo.code}</span>
                            </div>
                            {promo.description && (
                              <p className="text-gray-500 text-xs mt-1">{promo.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-yellow-400 font-bold">
                              {promo.discount_type === "percentage" 
                                ? `${promo.discount_value}%` 
                                : `$${promo.discount_value}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-300 capitalize">
                            {promo.applies_to === "pro_mode" ? "Pro Mode" : promo.applies_to}
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {promo.current_uses || 0} / {promo.max_uses || "∞"}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm">
                            {startDate || expirationDate ? (
                              <>
                                {startDate && <div>From: {startDate.toLocaleDateString()}</div>}
                                {expirationDate && <div>Until: {expirationDate.toLocaleDateString()}</div>}
                              </>
                            ) : (
                              "Always valid"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {!promo.is_active ? (
                              <span className="bg-gray-600/20 text-gray-400 px-2 py-1 rounded text-xs">Inactive</span>
                            ) : isExpired ? (
                              <span className="bg-red-600/20 text-red-400 px-2 py-1 rounded text-xs">Expired</span>
                            ) : isNotStarted ? (
                              <span className="bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded text-xs">Scheduled</span>
                            ) : isMaxUsesReached ? (
                              <span className="bg-orange-600/20 text-orange-400 px-2 py-1 rounded text-xs">Max Used</span>
                            ) : (
                              <span className="bg-green-600/20 text-green-400 px-2 py-1 rounded text-xs">Active</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditPromo(promo)}
                                className="text-blue-400 hover:text-blue-300 p-1"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleTogglePromoActive(promo)}
                                className={`p-1 ${promo.is_active ? "text-yellow-400 hover:text-yellow-300" : "text-green-400 hover:text-green-300"}`}
                                title={promo.is_active ? "Deactivate" : "Activate"}
                              >
                                {promo.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDeletePromoCode(promo.id)}
                                className="text-red-400 hover:text-red-300 p-1"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
